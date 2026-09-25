import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudRunImagePullPermission, verifyCloudRunImagePullAccess } from './cloud-run-image-access.mjs';

const profile = {
  imageRepository: 'us-east1-docker.pkg.dev/release-example/editorial-images/site/web',
  releaseProject: 'release-example',
  stagingProject: 'staging-example',
  productionProject: 'production-example',
};
const projectNumbers = { 'staging-example': '111111111111', 'production-example': '222222222222' };
const describeProject = async projectId => ({ projectId, projectNumber: projectNumbers[projectId] });
const resource = '//artifactregistry.googleapis.com/projects/release-example/locations/us-east1/repositories/editorial-images';
const request = projectNumber => ({
  resource,
  principalEmail: `service-${projectNumber}@serverless-robot-prod.iam.gserviceaccount.com`,
  permission: 'artifactregistry.repositories.downloadArtifacts',
});

test('checks both authoritative Cloud Run service agents on the exact repository, independent of runtime identities', async () => {
  const queriedProjects = [];
  const permissionQueries = [];
  const result = await verifyCloudRunImagePullAccess({
    ...profile,
    // These application identities cannot substitute for the image-pulling agents.
    stagingRuntimeIdentity: 'runtime@staging-example.iam.gserviceaccount.com',
    productionRuntimeIdentity: 'runtime@production-example.iam.gserviceaccount.com',
    describeProject: async projectId => { queriedProjects.push(projectId); return describeProject(projectId); },
    checkPermission: async query => { permissionQueries.push(query); return 'CAN_ACCESS'; },
  });
  assert.deepEqual(queriedProjects, ['staging-example', 'production-example']);
  assert.deepEqual(permissionQueries, [request('111111111111'), request('222222222222')]);
  assert.equal(result.resource, resource);
  assert.equal(result.permission, cloudRunImagePullPermission);
  assert.deepEqual(result.targets.map(target => target.environment), ['staging', 'production']);
});

test('staging access does not conceal missing production access; caller stops before build or promotion', async () => {
  const actions = [];
  await assert.rejects(async () => {
    await verifyCloudRunImagePullAccess({
      ...profile, describeProject,
      checkPermission: async query => {
        actions.push(query.principalEmail);
        return query.principalEmail === request('111111111111').principalEmail ? 'CAN_ACCESS' : 'CANNOT_ACCESS';
      },
    });
    actions.push('build-or-promote');
  }, /production Cloud Run service agent service-222222222222.*downloadArtifacts.*repositories\/editorial-images/);
  assert.deepEqual(actions, [request('111111111111').principalEmail, request('222222222222').principalEmail]);
});

test('denied, unknown and malformed effective IAM responses fail closed for either environment', async () => {
  for (const deniedAgent of ['111111111111', '222222222222']) {
    for (const result of ['CANNOT_ACCESS', 'UNKNOWN_INFO', undefined, true, { overallAccessState: 'CAN_ACCESS' }]) {
      await assert.rejects(verifyCloudRunImagePullAccess({
        ...profile, describeProject,
        checkPermission: async query => query.principalEmail === request(deniedAgent).principalEmail ? result : 'CAN_ACCESS',
      }), /lacks verified artifactregistry.repositories.downloadArtifacts/);
    }
  }
});

test('metadata must match each configured project and contain distinct authoritative numbers', async () => {
  for (const invalid of [
    undefined,
    { projectId: 'another-example', projectNumber: '111111111111' },
    { projectId: profile.stagingProject },
    { projectId: profile.stagingProject, projectNumber: 'not-a-number' },
    { projectId: profile.stagingProject, projectNumber: 9007199254740992 },
  ]) {
    let permissionQueries = 0;
    await assert.rejects(verifyCloudRunImagePullAccess({
      ...profile,
      describeProject: async () => invalid,
      checkPermission: async () => { permissionQueries++; return 'CAN_ACCESS'; },
    }), /authoritative project ID\/number/);
    assert.equal(permissionQueries, 0);
  }
  await assert.rejects(verifyCloudRunImagePullAccess({
    ...profile,
    describeProject: async projectId => ({ projectId, projectNumber: '111111111111' }),
    checkPermission: async () => assert.fail('IAM must not run for inconsistent project metadata'),
  }), /different project numbers/);
});

test('rejects redirected or malformed image targets before any cloud adapter runs', async () => {
  for (const override of [
    { imageRepository: profile.imageRepository.replace('release-example', 'another-example') },
    { imageRepository: `${profile.imageRepository}:latest` },
    { imageRepository: `${profile.imageRepository}@sha256:${'a'.repeat(64)}` },
    { imageRepository: `${profile.imageRepository}?repo=other` },
    { imageRepository: `${profile.imageRepository}/../other` },
    { imageRepository: profile.imageRepository.replace('/site/web', '') },
    { imageRepository: `https://${profile.imageRepository}` },
    { productionProject: profile.stagingProject },
    { stagingProject: '' },
  ]) {
    await assert.rejects(verifyCloudRunImagePullAccess({
      ...profile, ...override,
      describeProject: async () => assert.fail('metadata adapter must not run'),
      checkPermission: async () => assert.fail('IAM adapter must not run'),
    }), /distinct release, staging and production|untagged Artifact Registry image/);
  }
});

test('adapter failures stop verification without echoing raw cloud output', async () => {
  for (const failingAdapter of ['describeProject', 'checkPermission']) {
    await assert.rejects(verifyCloudRunImagePullAccess({
      ...profile, describeProject, checkPermission: async () => 'CAN_ACCESS',
      [failingAdapter]: async () => { throw new Error('sensitive raw diagnostic'); },
    }), error => /query failed/.test(error.message) && !error.message.includes('sensitive raw diagnostic'));
  }
  await assert.rejects(verifyCloudRunImagePullAccess({ ...profile }), /read-only project metadata/i);
});

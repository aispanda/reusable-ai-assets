export const cloudRunImagePullPermission = 'artifactregistry.repositories.downloadArtifacts';

const projectIdPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

// Supply read-only adapters for `gcloud projects describe --format=json` and
// effective IAM Policy Troubleshooter queries. This helper never grants access.
export async function verifyCloudRunImagePullAccess({
  imageRepository,
  releaseProject,
  stagingProject,
  productionProject,
  describeProject,
  checkPermission,
}) {
  const projects = [releaseProject, stagingProject, productionProject];
  if (projects.some(project => typeof project !== 'string' || !projectIdPattern.test(project))
    || new Set(projects).size !== 3) {
    throw new Error('Image access verification requires distinct release, staging and production project IDs.');
  }
  const image = typeof imageRepository === 'string'
    ? /^([a-z][a-z0-9-]*)-docker\.pkg\.dev\/([^/]+)\/([a-z0-9][a-z0-9._-]*)\/([a-z0-9][a-z0-9._/-]*)$/.exec(imageRepository)
    : null;
  if (!image || image[2] !== releaseProject
    || image[4].split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('IMAGE_REPOSITORY must be an untagged Artifact Registry image in the release project.');
  }
  if (typeof describeProject !== 'function' || typeof checkPermission !== 'function') {
    throw new Error('Read-only project metadata and effective IAM adapters are required.');
  }

  const resource = `//artifactregistry.googleapis.com/projects/${releaseProject}/locations/${image[1]}/repositories/${image[3]}`;
  const targets = [];
  for (const [environment, projectId] of [['staging', stagingProject], ['production', productionProject]]) {
    let project;
    try {
      project = await describeProject(projectId);
    } catch {
      throw new Error(`Cannot verify ${environment} Cloud Run image access: project metadata query failed for ${projectId}.`);
    }
    const projectNumber = String(project?.projectNumber ?? '');
    if (project?.projectId !== projectId || !/^[1-9][0-9]{0,19}$/.test(projectNumber)
      || (typeof project.projectNumber === 'number' && !Number.isSafeInteger(project.projectNumber))) {
      throw new Error(`Cannot verify ${environment} Cloud Run image access: authoritative project ID/number is missing or mismatched.`);
    }
    targets.push({
      environment,
      projectId,
      projectNumber,
      principalEmail: `service-${projectNumber}@serverless-robot-prod.iam.gserviceaccount.com`,
    });
  }
  if (targets[0].projectNumber === targets[1].projectNumber) {
    throw new Error('Staging and production project metadata must identify different project numbers.');
  }

  for (const target of targets) {
    let access;
    try {
      access = await checkPermission({ resource, principalEmail: target.principalEmail, permission: cloudRunImagePullPermission });
    } catch {
      throw new Error(`Cannot verify ${target.environment} Cloud Run image access: effective IAM query failed for ${target.principalEmail} on ${resource}.`);
    }
    if (access !== 'CAN_ACCESS') {
      throw new Error(`${target.environment} Cloud Run service agent ${target.principalEmail} lacks verified ${cloudRunImagePullPermission} on ${resource}. Resolve repository-scoped access separately before build or promotion.`);
    }
  }
  return { resource, permission: cloudRunImagePullPermission, targets };
}

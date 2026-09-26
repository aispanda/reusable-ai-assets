export const studioPublicUrl: (
  draft: { publicationStatus: string; publicationLiveUrl?: string; archivedAt?: string },
  staticPath?: string,
) => string | undefined;

export type PublicArticleSummary = {
  slug: string;
  title: string;
  collectionIds: string[];
  source?: 'host';
  path?: string;
  publishedAt?: string;
};
export const siteArticleIndex: <T extends { id: string; title: string; updatedAt: string; publicPath?: string; archivedAt?: string; publicationStatus: string }>(
  owned: T[], published: PublicArticleSummary[],
) => (T & { tags?: string; viewOnly?: boolean; source?: 'host' | 'published' })[];

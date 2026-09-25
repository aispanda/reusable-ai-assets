export const ARTICLE_LAYOUTS: readonly ['classic-reading', 'visual-journey', 'study-reflection'];
export const validArticleLayout: (value: unknown) => boolean;
export const articleLayout: (value?: unknown) => 'classic-reading' | 'visual-journey' | 'study-reflection' | null;

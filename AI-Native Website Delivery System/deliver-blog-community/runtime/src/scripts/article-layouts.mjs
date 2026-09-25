export const ARTICLE_LAYOUTS = Object.freeze(['classic-reading', 'visual-journey', 'study-reflection']);
export const validArticleLayout = value => ARTICLE_LAYOUTS.includes(value);
export const articleLayout = value => value === undefined ? 'classic-reading' : validArticleLayout(value) ? value : null;

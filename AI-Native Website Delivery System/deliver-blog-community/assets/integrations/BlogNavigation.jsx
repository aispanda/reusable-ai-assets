import React from 'react';
import { buildBlogLinks } from './blog-origin.mjs';

/** Full-page navigation; React, styling, origin and installation are target-owned. */
export default function BlogNavigation({ blogOrigin, className }) {
  const links = buildBlogLinks(blogOrigin);
  return (
    <nav aria-label="Blog and account" className={className}>
      <ul>
        {links.map(({ label, href }) => (
          <li key={href}>
            <a href={href} referrerPolicy="no-referrer">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const path = require("path");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/glyph.png");
  eleventyConfig.addPassthroughCopy("src/logo.jpg");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/blog/images");

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/blog/*.html")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addFilter("postSlug", (fileSlug) => {
    return fileSlug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  });

  eleventyConfig.addFilter("isoDate", (date) => {
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0];
  });

  eleventyConfig.addFilter("limit", (arr, n) => {
    return arr.slice(0, n);
  });

  eleventyConfig.addFilter("yearGroup", (posts) => {
    const groups = {};
    for (const post of posts) {
      const year = (post.data.date instanceof Date)
        ? post.data.date.getFullYear()
        : post.data.date.slice(0, 4);
      if (!groups[year]) groups[year] = [];
      groups[year].push(post);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, posts]) => ({ year, posts }));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};

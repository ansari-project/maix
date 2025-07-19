# Marpit Guide for Creating Presentation Decks

## Overview

Marpit is the core framework behind Marp (Markdown Presentation Ecosystem) that transforms Markdown into beautiful slide decks. This guide covers the essentials for creating compelling presentations.

## Basic Structure

### Document Setup
Every Marpit presentation starts with front-matter containing global directives:

```yaml
---
theme: default
size: 16:9
paginate: true
---
```

### Slide Separation
Use horizontal rulers (`---`) to separate slides:

```markdown
# First Slide

Content here

---

# Second Slide

More content
```

## Directives

### Global Directives (Front-matter)
- `theme`: Selects the presentation theme
- `size`: Sets slide aspect ratio (16:9 or 4:3)
- `paginate`: Enables page numbering
- `headingDivider`: Auto-creates slides at specified heading levels
- `style`: Inline CSS for the entire presentation

### Local Directives
Applied to current and following slides:

```markdown
<!-- paginate: true -->
<!-- header: 'My Header' -->
<!-- footer: 'My Footer' -->
<!-- backgroundColor: #def -->
<!-- color: #333 -->
```

Use underscore prefix for single-slide application:
```markdown
<!-- _class: lead -->
<!-- _backgroundColor: yellow -->
```

## Styling

### Inline Styles
Add custom CSS within your Markdown:

```markdown
<style>
section {
  background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
}
h1 {
  color: #333;
  border-bottom: 3px solid #ff6b6b;
}
</style>
```

### Scoped Styles
Apply styles to a single slide:

```markdown
<style scoped>
h1 { color: blue; }
</style>
```

## Images and Backgrounds

### Background Images
```markdown
![bg](image.jpg)
![bg left](image.jpg)
![bg right](image.jpg)
![bg fit](image.jpg)
![bg cover](image.jpg)
![bg auto](image.jpg)
![bg 40%](image.jpg)
![bg opacity:.5](image.jpg)
![bg blur:5px](image.jpg)
```

### Multiple Backgrounds
```markdown
![bg](image1.jpg)
![bg](image2.jpg)
```

## Layout Techniques

### Two-Column Layout
```markdown
<div class="columns">
<div>

### Left Column
- Point 1
- Point 2

</div>
<div>

### Right Column
- Point A
- Point B

</div>
</div>

<style>
.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem;
}
</style>
```

### Centered Content
```markdown
<!-- _class: lead -->

# Big Centered Title

A powerful statement
```

## Advanced Features

### Headers and Footers
```markdown
<!-- header: 'Project Name | Section' -->
<!-- footer: 'Page _ of _total_' -->
```

### Custom Pagination
```css
section::after {
  content: attr(data-marpit-pagination) ' / ' attr(data-marpit-pagination-total);
  position: absolute;
  bottom: 10px;
  right: 10px;
}
```

### CSS Variables
```css
:root {
  --primary: #1e3a8a;
  --secondary: #d97706;
  --accent: #059669;
}
```

## Best Practices

1. **Keep slides focused**: One main idea per slide
2. **Use visual hierarchy**: Headers, subheaders, body text
3. **Leverage white space**: Don't overcrowd slides
4. **Consistent styling**: Use CSS variables for colors
5. **Progressive disclosure**: Build complex ideas step by step

## Common Patterns

### Title Slide
```markdown
<!-- _class: lead -->
<!-- _backgroundColor: var(--primary) -->
<!-- _color: white -->

# Project Title

## Subtitle or Tagline

**Author Name**
Date
```

### Section Divider
```markdown
<!-- _class: section -->
<!-- _backgroundColor: var(--accent) -->

# Section Name
```

### Conclusion Slide
```markdown
<!-- _class: lead -->

# Thank You

Questions?

contact@example.com
```

## Export Options

Marpit presentations can be exported as:
- HTML (interactive)
- PDF (printable)
- PNG images
- PowerPoint (PPTX)

## Tips

- Use emoji for visual interest: ✨ 🚀 💡
- Keep text concise
- Use code blocks for technical content
- Test export formats early
- Consider accessibility (contrast, font size)
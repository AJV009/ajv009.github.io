# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugoplate is a Hugo-based portfolio template built with Tailwind CSS v4.0. It's designed as a starter template with pre-configured features including dark mode, search functionality, multi-author support, and comprehensive deployment configurations.

**Key Technologies:**
- Hugo Static Site Generator (min version 0.144.0)
- Tailwind CSS v4.0
- Node.js (v22+) for build tools
- Go (v1.24+) for Hugo modules

## Common Development Commands

### Initial Setup (First Time Only)
```bash
npm run project-setup    # Sets up theme structure and moves exampleSite to root
npm install             # Install Node.js dependencies
```

### Development
```bash
npm run dev             # Start Hugo development server
npm run dev:example     # Start development server for exampleSite
```

### Building
```bash
npm run build           # Production build with minification
npm run preview         # Preview production build locally
npm run build:example   # Build exampleSite
```

### Code Quality
```bash
npm run format          # Format code with Prettier
```

### Theme Management
```bash
npm run update-theme    # Update theme to latest version
npm run update-modules  # Update Hugo modules
npm run remove-darkmode # Remove dark mode functionality
```

## Project Architecture

### Directory Structure After Setup
- **Root directory** is now the actual Hugo site (after running `npm run project-setup`)
- **themes/hugoplate/** contains the template files (layouts and assets moved here)
- **content/english/** contains Markdown content files organized by language
- **config/** contains Hugo configuration files
- **data/** contains JSON configuration files (theme.json, social.json)
- **hugo.toml** in root (moved from exampleSite, with theme="hugoplate" uncommented)

### Key Configuration Files

**Hugo Configuration:**
- `hugo.toml` - Main Hugo configuration
- `config/_default/params.toml` - Site parameters and feature toggles
- `config/_default/menus.en.toml` - Navigation structure
- `config/_default/languages.toml` - Multi-language settings

**Theme Configuration:**
- `data/theme.json` - Colors, fonts, and design tokens
- `data/social.json` - Social media links

### Template System

**Layout Hierarchy:**
- `themes/hugoplate/layouts/_default/baseof.html` - Base template
- `themes/hugoplate/layouts/_default/list.html` - List pages (blog, categories, etc.)
- `themes/hugoplate/layouts/_default/single.html` - Single content pages
- `themes/hugoplate/layouts/index.html` - Homepage template
- `themes/hugoplate/layouts/partials/` - Reusable template components

**Content Types:**
- `content/english/blog/` - Blog posts
- `content/english/authors/` - Author profiles
- `content/english/pages/` - Static pages (privacy policy, terms, etc.)
- `content/english/about/` - About page
- `content/english/contact/` - Contact page
- `content/english/_index.md` - Homepage content

### Asset Pipeline

**CSS Architecture:**
- `themes/hugoplate/assets/css/main.css` - Main Tailwind CSS entry point
- `themes/hugoplate/assets/css/components.css` - Custom component styles
- `themes/hugoplate/assets/css/utilities.css` - Utility classes
- `themes/hugoplate/assets/css/navigation.css` - Navigation-specific styles

**JavaScript:**
- `themes/hugoplate/assets/js/main.js` - Main JavaScript functionality
- `themes/hugoplate/assets/plugins/` - Third-party plugins (Swiper, GLightbox, etc.)

### Build System

The project uses a custom build setup:
1. **Project Setup Script** (`scripts/projectSetup.js`) - Restructures directories for development
2. **Hugo Build** - Processes templates and content
3. **Tailwind CSS** - Compiles CSS with purging for production
4. **Asset Processing** - Optimizes images and other assets

### Hugo Modules

The template uses Hugo modules for extended functionality:
- Images module for favicon and logo handling
- SEO module for metadata management
- Search module for site search functionality
- Components modules for UI elements

### Deployment Configurations

Pre-configured for multiple platforms:
- **Netlify** (`netlify.toml`) - Automated deployments
- **Vercel** (`vercel.json` + `vercel-build.sh`) - Serverless deployments
- **GitHub Pages** (`.github/workflows/main.yml`) - GitHub Actions workflow
- **GitLab CI** (`.gitlab-ci.yml`) - GitLab deployments
- **AWS Amplify** (`amplify.yml`) - AWS deployments

## Important Notes

### Before Making Changes
1. **IMPORTANT**: Run `npm run project-setup` first if working with a fresh clone
2. After setup, the `exampleSite/` directory is removed and its contents moved to root
3. Theme files (layouts, assets) are moved to `themes/hugoplate/`
4. The `hugo.toml` file is moved to root with theme configuration uncommented

### Development Workflow
1. Make content changes in `content/english/` directory
2. Make theme/template changes in `themes/hugoplate/layouts/`
3. Make style changes in `themes/hugoplate/assets/css/`
4. Test locally with `npm run dev`
5. Build for production with `npm run build`
6. Deploy using preferred platform configuration

### Configuration Customization
- Site settings: `hugo.toml` and `config/_default/params.toml`
- Visual theme: `data/theme.json`
- Navigation: `config/_default/menus.en.toml`
- Social links: `data/social.json`

### Content Management
- Blog posts go in `content/english/blog/`
- Author profiles in `content/english/authors/`
- Static pages in `content/english/pages/`
- Homepage content in `content/english/_index.md`
- About page in `content/english/about/`
- Contact page in `content/english/contact/`
- All content uses Hugo's front matter format with multilingual support
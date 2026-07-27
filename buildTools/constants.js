const protocol = process.env.HTTPS?.trim() === 'true' ? 'https' : 'http',
  openInBrowser = process.env.BROWSER?.trim() !== 'none';

module.exports = {
  port: 3000,
  protocol,
  devServer: `${protocol}://localhost`,
  openInBrowser,
  jestDirectory: 'jest',
  rootDirectory: 'src',
  buildToolsDirectory: 'buildTools',
  publicDirectory: 'public',
  outputDirectory: 'dist',
  environmentsDirectory: 'environments',
  jsSubDirectory: 'js/',
  cssSubDirectory: 'css/',
  isCssModules: false,
  metaInfo: {
    //displayed in search engines at the top of URL
    siteName: 'AI Formula Builder',
    //max 60 (recommended)
    title: 'AI Formula Builder',
    //max 150 (recommended)
    description: 'Build AI/ML mathematical equations quickly for Microsoft Word.',
    keywords: 'equations, mathematics, AI, machine learning, formula builder',
    twitterCardType: 'summary', //summary - summary_large_image - app
  },
};

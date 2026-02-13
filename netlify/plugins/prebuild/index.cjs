const { execSync } = require('child_process');

module.exports = {
  async onPreBuild() {
    console.log('🔧 Running prebuild to remove Tailwind native bindings...');
    try {
      execSync('node scripts/create-stubs.js', { 
        stdio: 'inherit'
      });
      console.log('✅ Prebuild completed successfully');
    } catch (error) {
      console.error('❌ Prebuild failed:', error.message);
      throw error;
    }
  }
};

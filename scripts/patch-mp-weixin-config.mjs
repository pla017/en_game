import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectConfigPath = resolve('dist/build/mp-weixin/project.config.json');
const privateConfigPath = resolve('dist/build/mp-weixin/project.private.config.json');
const rootConfigPath = resolve('project.config.json');
const vendorPath = resolve('dist/build/mp-weixin/common/vendor.js');
const stableLibVersion = '3.8.12';

if (!existsSync(projectConfigPath)) {
  console.error(`Project config not found: ${projectConfigPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(projectConfigPath, 'utf8'));

config.appid = config.appid || 'touristappid';
config.libVersion = stableLibVersion;
config.setting = {
  ...(config.setting || {}),
  urlCheck: false,
  es6: true,
  postcss: true,
  minified: true,
  newFeature: false,
  bigPackageSizeSupport: true
};

writeFileSync(projectConfigPath, `${JSON.stringify(config, null, 2)}\n`);

const rootConfig = {
  description: 'uni-app source project. WeChat DevTools should run the built mini program under dist/build/mp-weixin.',
  miniprogramRoot: 'dist/build/mp-weixin/',
  compileType: 'miniprogram',
  libVersion: stableLibVersion,
  appid: config.appid,
  projectname: config.projectname || 'en-game',
  setting: config.setting
};

writeFileSync(rootConfigPath, `${JSON.stringify(rootConfig, null, 2)}\n`);

const privateConfig = {
  projectname: config.projectname || 'en-game',
  appid: config.appid,
  libVersion: stableLibVersion,
  setting: config.setting
};

writeFileSync(privateConfigPath, `${JSON.stringify(privateConfig, null, 2)}\n`);

if (existsSync(vendorPath)) {
  let vendor = readFileSync(vendorPath, 'utf8');
  vendor = vendor.replace(
    /!function\(\)\{if\(h\(wx\.preloadAssets\)\)\{.*?wx\.createApp=global\.createApp=vc,/,
    'wx.createApp=global.createApp=vc,'
  );
  writeFileSync(vendorPath, vendor);
}

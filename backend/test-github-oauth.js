#!/usr/bin/env node

const { db } = require('./dist/db/index.js');
const { githubOAuthConfig, githubOAuthRedirectUris } = require('./dist/db/schema.js');
const { GitHubOAuthService } = require('./dist/services/github-oauth.js');
const { eq } = require('drizzle-orm');

async function testGitHubOAuth() {
  try {
    console.log('🔍 开始测试GitHub OAuth配置...\n');

    // 1. 检查配置
    console.log('1️⃣ 检查GitHub OAuth配置...');
    const config = await db.select().from(githubOAuthConfig).get();
    
    if (!config) {
      console.log('❌ 未找到GitHub OAuth配置');
      return;
    }
    
    if (!config.enabled) {
      console.log('❌ GitHub OAuth未启用');
      return;
    }
    
    if (!config.clientId || !config.clientSecret) {
      console.log('❌ GitHub OAuth配置不完整');
      return;
    }
    
    console.log('✅ GitHub OAuth配置正常');
    console.log(`   Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   Enabled: ${config.enabled}\n`);

    // 2. 检查回调URI
    console.log('2️⃣ 检查回调URI配置...');
    const redirectUris = await db
      .select()
      .from(githubOAuthRedirectUris)
      .where(eq(githubOAuthRedirectUris.enabled, true))
      .all();

    if (redirectUris.length === 0) {
      console.log('❌ 未找到启用的回调URI');
      return;
    }

    console.log('✅ 回调URI配置正常');
    redirectUris.forEach((uri, index) => {
      console.log(`   ${index + 1}. ${uri.redirectUri}`);
    });
    console.log();

    // 3. 测试授权URL生成
    console.log('3️⃣ 测试授权URL生成...');
    const githubOAuth = new GitHubOAuthService({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: redirectUris[0].redirectUri
    });

    const authUrl = githubOAuth.getAuthUrl('test-state');
    console.log('✅ 授权URL生成成功');
    console.log(`   URL: ${authUrl}\n`);

    // 4. 验证权限范围
    console.log('4️⃣ 验证权限范围...');
    const urlParams = new URL(authUrl).searchParams;
    const scope = urlParams.get('scope');
    console.log(`   Scope: ${scope}`);
    
    if (scope && scope.includes('user') && scope.includes('user:email')) {
      console.log('✅ 权限范围配置正确\n');
    } else {
      console.log('⚠️  权限范围可能需要调整\n');
    }

    // 5. 测试API端点可达性
    console.log('5️⃣ 测试GitHub API端点可达性...');
    try {
      const response = await fetch('https://api.github.com/', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FireflyCloud-OAuth-App'
        }
      });
      
      if (response.ok) {
        console.log('✅ GitHub API端点可达');
        const data = await response.json();
        console.log(`   API版本: ${data.current_user_url ? '正常' : '未知'}\n`);
      } else {
        console.log(`⚠️  GitHub API响应异常: ${response.status} ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`❌ GitHub API端点不可达: ${error.message}\n`);
    }

    console.log('🎉 GitHub OAuth配置测试完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 确保GitHub OAuth应用配置正确');
    console.log('2. 验证回调URI在GitHub应用中已正确配置');
    console.log('3. 检查网络连接和防火墙设置');
    console.log('4. 重新测试OAuth登录流程');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  testGitHubOAuth();
}

module.exports = { testGitHubOAuth }; 
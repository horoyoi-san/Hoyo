#!/usr/bin/env node

const { db } = require('./dist/db/index.js');
const { microsoftOAuthConfig, microsoftOAuthRedirectUris } = require('./dist/db/schema.js');
const { MicrosoftOAuthService } = require('./dist/services/microsoft-oauth.js');
const { eq } = require('drizzle-orm');

async function testMicrosoftOAuth() {
  try {
    console.log('🔍 开始测试Microsoft OAuth配置...\n');

    // 1. 检查配置
    console.log('1️⃣ 检查Microsoft OAuth配置...');
    const config = await db.select().from(microsoftOAuthConfig).get();
    
    if (!config) {
      console.log('❌ 未找到Microsoft OAuth配置');
      return;
    }
    
    if (!config.enabled) {
      console.log('❌ Microsoft OAuth未启用');
      return;
    }
    
    if (!config.clientId || !config.clientSecret) {
      console.log('❌ Microsoft OAuth配置不完整');
      return;
    }
    
    console.log('✅ Microsoft OAuth配置正常');
    console.log(`   Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   Tenant ID: ${config.tenantId}`);
    console.log(`   Enabled: ${config.enabled}\n`);

    // 2. 检查回调URI
    console.log('2️⃣ 检查回调URI配置...');
    const redirectUris = await db
      .select()
      .from(microsoftOAuthRedirectUris)
      .where(eq(microsoftOAuthRedirectUris.enabled, true))
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
    const microsoftOAuth = new MicrosoftOAuthService({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: redirectUris[0].redirectUri,
      tenantId: config.tenantId || 'common'
    });

    const authUrl = microsoftOAuth.getAuthUrl('test-state');
    console.log('✅ 授权URL生成成功');
    console.log(`   URL: ${authUrl}\n`);

    // 4. 验证权限范围和租户配置
    console.log('4️⃣ 验证权限范围和租户配置...');
    const urlParams = new URL(authUrl).searchParams;
    const scope = urlParams.get('scope');
    const tenantIdInUrl = authUrl.match(/\/([^\/]+)\/oauth2\/v2\.0\/authorize/)?.[1];
    
    console.log(`   Scope: ${scope}`);
    console.log(`   Tenant ID: ${tenantIdInUrl}`);
    
    if (scope && scope.includes('openid') && scope.includes('User.Read')) {
      console.log('✅ 权限范围配置正确');
    } else {
      console.log('⚠️  权限范围可能需要调整');
    }
    
    if (tenantIdInUrl === config.tenantId) {
      console.log('✅ 租户配置正确\n');
    } else {
      console.log('⚠️  租户配置可能有问题\n');
    }

    // 5. 测试Microsoft Graph API端点可达性
    console.log('5️⃣ 测试Microsoft Graph API端点可达性...');
    try {
      const response = await fetch('https://microsoftgraph.chinacloudapi.cn/v1.0/$metadata', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FireflyCloud-OAuth-App'
        }
      });
      
      if (response.ok) {
        console.log('✅ Microsoft Graph API端点可达');
        console.log(`   响应状态: ${response.status} ${response.statusText}\n`);
      } else {
        console.log(`⚠️  Microsoft Graph API响应异常: ${response.status} ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`❌ Microsoft Graph API端点不可达: ${error.message}\n`);
    }

    // 6. 测试Microsoft授权端点可达性
    console.log('6️⃣ 测试Microsoft授权端点可达性...');
    try {
      const authEndpoint = `https://login.partner.microsoftonline.cn/${config.tenantId || 'common'}/oauth2/v2.0/authorize`;
      const response = await fetch(authEndpoint + '?client_id=test', {
        method: 'GET',
        headers: {
          'User-Agent': 'FireflyCloud-OAuth-App'
        }
      });
      
      // 即使是错误的client_id，也应该能到达授权端点
      if (response.status === 400 || response.status === 401 || response.status === 200) {
        console.log('✅ Microsoft授权端点可达');
        console.log(`   响应状态: ${response.status} ${response.statusText}\n`);
      } else {
        console.log(`⚠️  Microsoft授权端点响应异常: ${response.status} ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`❌ Microsoft授权端点不可达: ${error.message}\n`);
    }

    console.log('🎉 Microsoft OAuth配置测试完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 启动后端服务，数据库表将自动创建');
    console.log('2. 在管理后台配置Microsoft OAuth');
    console.log('3. 在Azure Portal中创建应用注册');
    console.log('4. 验证回调URI在Azure Portal中已正确配置');
    console.log('5. 检查应用程序权限设置');
    console.log('6. 确保租户配置与应用注册匹配');
    console.log('7. 重新测试OAuth登录流程');

    console.log('\n🔗 有用的链接：');
    console.log('- Azure Portal: https://portal.azure.cn');
    console.log('- Microsoft Graph Explorer: https://developer.microsoft.com/graph/graph-explorer');
    console.log('- OAuth 2.0 文档: https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  testMicrosoftOAuth();
}

module.exports = { testMicrosoftOAuth }; 
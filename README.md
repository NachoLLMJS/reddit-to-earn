# $KARMA

一个面向中文社区的 Reddit 贡献奖励落地页。

核心机制：用户购买 `$KARMA`，协议费用按已验证规则兑换为 `RDDT`，再奖励给在 Reddit 上发布本项目相关合格内容的贡献者。

## 本地运行

```bash
python -m http.server 4189
```

打开 http://127.0.0.1:4189

## 安全配置

在后端与领取合约真实部署并验证后，编辑 `config.js`：

- `buyUrl`：官方 `$KARMA` 购买入口。
- `redditVerifyUrl`：验证公开 Reddit 帖子链接的 POST 接口。浏览器发送 `redditProfile`、`walletAddress` 和 `postUrl`；只有真实通过时才应返回 `verified: true`、`rewardDisplay` 与钱包专属 `claim` 数据。
- `claimContract`：浏览器允许调用的唯一领取合约地址。
- `claimCalldata`：可选静态 calldata 备用值。
- `requiredChainId`：要求使用的 EIP-155 网络 ID。

页面默认关闭购买、Reddit 链接验证和领取路径；不会在缺少配置时显示虚假成功。只有帖子链接通过安全后端验证后，代币化 RDDT 才会进入可领取状态。绝不要把 Reddit client secret、私钥、签名密钥或访问令牌写入 `config.js`。

## 视觉资产

- `assets/karma-logo.png`：图像模型生成的 `$KARMA` 角色字标。
- `assets/karma-hero.png`：角色照料发光社区花园的可爱 3D 主视觉。
- `assets/karma-community-exchange.png`：社区工作室式费用兑换与分发插画。
- `assets/karma-reward-line.png`：贡献验证与奖励投递插画。
- `assets/community-mascot.png`：原始角色主图。

所有新插画均围绕同一白色外星角色生成，并保留项目内使用。第三方名称与商标归其各自权利人所有。

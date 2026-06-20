# 羽毛球活动助手

一个手机端 H5 单页应用，用于每次羽毛球活动后快速计算男生、女生分别应付金额，并保存本地历史记录、复制微信群收款文案。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages 部署

项目已配置 GitHub Actions。推送到 `main` 分支后，GitHub Pages 会自动构建并发布。

发布地址预计为：

```text
https://fd918.github.io/yumaoqiu/
```

## 数据存储说明

第一版没有后端、登录、云同步或数据库。历史记录和我的设置都保存在当前浏览器的 `localStorage` 中。

清理浏览器缓存、更换浏览器或更换手机会导致历史记录和设置丢失。

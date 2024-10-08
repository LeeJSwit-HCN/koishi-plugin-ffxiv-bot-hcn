# koishi-plugin-ffxiv-bot-hcn

[![npm](https://img.shields.io/npm/v/koishi-plugin-ffxiv-bot-hcn?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ffxiv-bot-hcn)

FF14查价机器人 Universalis集成 By.HCN

-使用方法：

    查价 <物品名>
    例如：
        查价 巨匠药酒
        查价 巨匠药酒 -s 猫小胖
        查价 巨匠药酒 -s 猫小胖 -l 20

-注意：

    本插件查价功能是直接调用Universalis REST API，请注意使用频率。
    API 上的速率限制为 25 req/s（一般情况下用不了这么高，除非一个机器人一堆群）


bug：未使用koishi推荐的ctx.http() 来执行 HTTP 请求，在安装插件时会显示Error : Cannot find module axios   目前正在积极修复

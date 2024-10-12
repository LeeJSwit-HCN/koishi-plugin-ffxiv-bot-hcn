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



-开发中：
    
    查询物品交易历史
    
-bug:
    
    在请求universalis API时，有时会发生数据包错误的问题，在发送第二次相同查价请求时，则会恢复正常。
    考虑是universalis API在长时间未发送报文后，会生成客户端更新数据导致的。

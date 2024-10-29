# koishi-plugin-ffxiv-bot-hcn

[![npm](https://img.shields.io/npm/v/koishi-plugin-ffxiv-bot-hcn?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ffxiv-bot-hcn)
FF14查价机器人 Universalis集成 By.HCN

koishi-plugin-ffxiv-bot-hcn是Koishi-Bot的插件，请使用Koishi的插件市场下载。
Universalis是FFXIV市场板数据的众包聚合器。此软件包是非官方的，不受Universalis开发人员的支持。

-使用方法：

    查询物品市场价格:
    查价 <物品名> -s [服务器] -l [结果数] -o
    例如：
        查价 巨匠药酒                     //查询配置的默认服务器巨匠药酒的价格
        查价 巨匠药酒 -s 猫小胖           //查询猫小胖服务器巨匠药酒的价格
        查价 巨匠药酒 -s 猫小胖 -l 20     //查询猫小胖服务器巨匠药酒的价格，显示20条
        查价 巨匠药酒 -s 猫小胖 -l 20 -o  //查询猫小胖服务器巨匠药酒的价格，仅查看HQ，显示20条
        cj 巨匠药酒                      //这个也能触发
        /查价 巨匠药酒                   //适配QQbot的默认指令模式

    查询物品交易历史:
    查价 <物品名> -s [服务器] -l [结果数]
    例如：
        查历史 巨匠药酒                    //查询配置的默认服务器巨匠药酒的交易历史
        查历史 巨匠药酒 -s 猫小胖          //查询猫小胖服务器巨匠药酒的交易历史
        查历史 巨匠药酒 -s 猫小胖 -l 20    //查询猫小胖服务器巨匠药酒的交易历史，显示20条
        cls 巨匠药酒                      //这个也能触发
        /查历史 巨匠药酒                  //适配QQbot

-注意：

    本插件查价功能是直接调用Universalis REST API，请注意使用频率。
    API 上的速率限制为 25 req/s（一般情况下用不了这么高，除非一个机器人一堆群）

-开发中：
    
    1.跨服购买推荐
    2.更多的配置项与初始化指令类
    

-Bug：
    1.国际服调用xivapi有点问题，但是国服调用cakemakerAPI没问题
    
    只是用的话还是能用滴，但是别看源代码（bug一堆），还有些没实现的功能，但是接口什么的已经写里面了，就当是不存在嗷。
    上班摸鱼的时候慢慢改喽

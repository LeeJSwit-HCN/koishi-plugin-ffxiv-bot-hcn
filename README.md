# koishi-plugin-ffxiv-bot-hcn

[![npm](https://img.shields.io/npm/v/koishi-plugin-ffxiv-bot-hcn?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ffxiv-bot-hcn)

FF14查价机器人 Universalis集成 By.HCN

优化了内容显示

存在的bug：

    1.服区设置-数据中心切换需要点击两次。
    推测；切换DataCenter需要清空DataCenter.Server中的数据，第一次为清空数据，第二次才能正常切换。可能需要等待Schema更新双union嵌套，才能解决此bug

正在开发中：

    数据库功能：

    1.用户可注册服区信息，注册用户优先调用数据库中的服区信息来进行查价
    2.用户可以设定关注列表，bot间隔一定时间推送物品价格。可自定：权限用户，间隔时间，关注数量
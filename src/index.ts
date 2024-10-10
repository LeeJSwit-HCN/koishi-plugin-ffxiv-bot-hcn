import { Context, Schema } from 'koishi'
import { } from '@koishijs/plugin-console'


export const name = 'ffxiv-bot-hcn'
export const usage = '指令：查价 <物品名>'

export interface Config {
  DataCenter: { Server: any }
  Server: string
  Gst: boolean
  Limit: number
}
export const schema = Schema.intersect([
  Schema.object({
    DataCenter: Schema.union([
      Schema.object({
        Server: Schema.union(['陆行鸟', '莫古力', '猫小胖', '豆豆柴']).description('服区').required(),
      }).description('China'),
      Schema.object({
        Server: Schema.union(['Elemental', 'Gaia', 'Mana', 'Meteor']).description('服区').required(),
      }).description('Japan'),
      Schema.object({
        Server: Schema.union(['Aether', 'Primal', 'Crystal', 'Dynamis']).description('服区').required(),
      }).description('North-America'),
      Schema.object({
        Server: Schema.union(['Chaos', 'Light']).description('服区').required()
      }).description('Europe'),
      Schema.object({
        Server: Schema.string().pattern(/^Materia$/i).default('Materia').description('服区').required(),
      }).description('Oceania'),
    ]).description('数据中心').required(),
  }).description('服区设置'),
  Schema.object({
    Gst: Schema.boolean().default(true).description('自动计算税后价')
  }).description('查价设置'),
  Schema.object({
    Limit: Schema.number().role('slider').min(3).max(20).step(1).default(5).description('查价结果行数')
  }).description('消息设置'),
])

export function apply(ctx: Context, config: Config) {
  ctx.command('查价')
    .alias('/查价')
    .option('server', '-s <server> 目标服务器', { fallback: config.DataCenter.Server })
    .option('limit', '-l <limit> 结果行数', { fallback: config.Limit })
    .option('gst', '-g 输出税后价格', { fallback: config.Gst })
    .example('查价 巨匠药酒 -s 猫小胖 -l 20 -g 解释：查询猫小胖服巨匠药酒20条税后价格数据')
    .action(async ({ session, options }, input) => {
      if (!input?.trim()) {
        return session.execute('help 查价');
      }
      var itemId: number;
      var itemName: string;
      var itemSearch_url = '';
      var reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
      if (reg.test(config.DataCenter.Server)) {
        itemSearch_url = "https://cafemaker.wakingsands.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
      } else {
        itemSearch_url = "https://xivapi.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
      }
      var itemSearch_recvJson: { Pagination: { ResultsTotal: number }; Results: { Name: string, ID: number }[] }
      await ctx.http.get(itemSearch_url).then((response) => {
        itemSearch_recvJson = response
      }).then(async () => {
        if (itemSearch_recvJson.Pagination.ResultsTotal == 0) {
          session.send('未查询到包含\'' + input + '\'的物品,你确定市场上有卖吗？');
        } else if (itemSearch_recvJson.Pagination.ResultsTotal == 1) {
          session.send(itemSearch_recvJson.Results[0].Name + " - " + options.server + '价格查询中');
          itemId = itemSearch_recvJson.Results[0].ID;
          itemName = itemSearch_recvJson.Results[0].Name;
          getPrices(ctx,session, itemName, itemId, options);
        } else {
          var menu = '';
          var resultsTotal = '';
          var count = 0;
          resultsTotal += itemSearch_recvJson.Pagination.ResultsTotal;
          if (Number(resultsTotal) <= 250) {
            menu += '查询到' + itemSearch_recvJson.Pagination.ResultsTotal + '个包含\' ' + input + ' \'的结果,请输入序号\n';
            for (var i = 0; i < itemSearch_recvJson.Pagination.ResultsTotal; i++) {
              if ((i + 1) < 10) { menu += ' '; }
              if ((i + 1) % 2 == 0) { menu += '    '; }
              menu += i + 1;
              menu += '  ';
              menu += itemSearch_recvJson.Results[i].Name;
              if ((i + 1) % 2 == 0) { menu += '\n' }
              count++;
            }
            session.send(menu);
            var num = await session.prompt();
            if (!num) {
              session.send('不搭理我,我走了');
            } else if (isNaN(Number(num)) || num.indexOf('.') > -1) {
              session.send('麻烦你输入序号,你再好好想想,我先走了');
            } else if (Number(num) <= 0 || Number(num) > count + 1) {
              session.send('序号就这几个,你再好好想想,我先走了');
            } else {
              session.send(itemSearch_recvJson.Results[Number(num) - 1].Name + " - " + options.server + '价格查询中');
              itemId = itemSearch_recvJson.Results[Number(num) - 1].ID
              itemName = itemSearch_recvJson.Results[Number(num) - 1].Name;
              getPrices(ctx,session, itemName, itemId, options);
            }
          }
        }
      })
    })
}

async function getPrices(ctx: Context, session, itemName: string, itemId: number, options: any) {
  var server = options.server;
  var gst = options.gst;
  var limit = options.limit;
  var universalis_HQ = 'https://universalis.app/api/v2/' + encodeURI(server) + '/' + itemId + '?listings=' + limit + '&noGst=' + gst + '&hq=1' + '&fields=lastUploadTime%2Clistings.pricePerUnit%2Clistings.quantity%2Clistings.worldName';
  var universalis_NQ = 'https://universalis.app/api/v2/' + encodeURI(server) + '/' + itemId + '?listings=' + limit + '&noGst=' + gst + '&hq=nq' + '&fields=lastUploadTime%2Clistings.pricePerUnit%2Clistings.quantity%2Clistings.worldName';
  var universalis_HQ_recvJson;
  var universalis_NQ_recvJson;
  var backmessage = itemName + "  -  " + options.server;
  var lastTime: string;
  await ctx.http.get(universalis_HQ).then((response) => {
    universalis_HQ_recvJson = response;
    lastTime = '\n更新时间:' + new Date(universalis_HQ_recvJson.lastUploadTime).toLocaleString() + '\n';
  }).catch((error) => {
    if (error.response) {
      switch (error.response.status) {
        case 500: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 501: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 502: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 503: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 504: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 404: backmessage = 'The world/DC or item requested is invalid. When requesting multiple items at once, an invalid item ID will not trigger this. Instead, the returned list of unresolved item IDs will contain the invalid item ID or IDs.'; break;
        case 400: backmessage = 'The parameters were invalid.'; break;
      }
    } else if (error.request) { backmessage = '网络请求失败,请联系管理员'; }
  });
  await ctx.http.get(universalis_NQ).then((response) => {
    universalis_NQ_recvJson = response;
    lastTime = '\n更新时间:' + new Date(universalis_NQ_recvJson.lastUploadTime).toLocaleString() + '\n';
  }).catch((error) => {
    if (error.response) {
      switch (error.response.status) {
        case 500: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 501: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 502: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 503: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 504: backmessage = 'Universalis服务异常,请稍后再试'; break;
        case 404: backmessage = 'The world/DC or item requested is invalid. When requesting multiple items at once, an invalid item ID will not trigger this. Instead, the returned list of unresolved item IDs will contain the invalid item ID or IDs.'; break;
        case 400: backmessage = 'The parameters were invalid.'; break;
      }
    } else if (error.request) { backmessage = '网络请求失败,请联系管理员'; }
  });
  backmessage += lastTime;
  if (universalis_HQ_recvJson.listings.length != 0) {
    backmessage += 'HQ:\n';
    for (var i = 0; i < universalis_HQ_recvJson.listings.length; i++) {
      backmessage += '        '
        + universalis_HQ_recvJson.listings[i].pricePerUnit + '×'
        + universalis_HQ_recvJson.listings[i].quantity + '  '
        + universalis_HQ_recvJson.listings[i].worldName + '\n'
    }
  } else { backmessage += 'HQ:  没货\n'; }
  if (universalis_NQ_recvJson.listings.length != 0) {
    backmessage += 'NQ:\n';
    for (var i = 0; i < universalis_NQ_recvJson.listings.length; i++) {
      backmessage += '        '
        + universalis_NQ_recvJson.listings[i].pricePerUnit + '×'
        + universalis_NQ_recvJson.listings[i].quantity + '  '
        + universalis_NQ_recvJson.listings[i].worldName + '\n'
    }
  } else { backmessage += 'NQ:  没货\n'; }
  session.send(backmessage);
}

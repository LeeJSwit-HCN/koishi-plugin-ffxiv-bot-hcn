import { Context, Schema } from 'koishi'
import { } from '@koishijs/plugin-console'

export const name = 'ffxiv-bot-hcn'
export const usage = '指令：查价 <物品名>'

export interface Config {
  DataCenter: { Server: any }
  Server: string
  Gst: boolean
  Limit: number
  IsSell: boolean
  ToBuy: boolean
  EntriesToReturn: number
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
    Limit: Schema.number().role('slider').min(3).max(20).step(1).default(10).description('查价结果行数'),
    Gst: Schema.boolean().default(true).description('自动计算税后价'),
    IsSell: Schema.boolean().default(true).description('删除可能已经卖掉的物品价格'),
    ToBuy: Schema.boolean().default(true).description('生成推荐去哪个服务器买东西')
  }).description('查价设置'),//添加最大重新尝试次数
  Schema.object({
    EntriesToReturn: Schema.number().role('slider').min(5).max(100).step(1).default(15).description('查历史结果行数')
  }).description('查历史设置'),
])

export function apply(ctx: Context, config: Config) {
  ctx.command('查价')
    .alias('/查价').alias('cj')
    .option('server', '-s <server> 目标服务器', { fallback: config.DataCenter.Server })
    .option('limit', '-l <limit> 结果行数', { fallback: config.Limit })
    .option('gst', '-g 输出税后价格', { fallback: config.Gst })
    .option('isSell', '-i 删除可能已经卖掉的物品', { fallback: config.IsSell })
    .option('toBuy', '-b 生成推荐去哪个服务器买', { fallback: config.ToBuy })
    .example('查价 巨匠药酒 -s 猫小胖 -l 20 -g 解释：查询猫小胖服巨匠药酒20条税后价格数据')
    .action(({ session, options }, input) => {
      if (!input?.trim()) {
        return session.execute('help 查价');
      }
      let itemId: number;
      let itemName: string;
      let itemSearch_url: string;
      let reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
      if (reg.test(config.DataCenter.Server)) {
        itemSearch_url = "https://cafemaker.wakingsands.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
      } else {
        itemSearch_url = "https://xivapi.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
      }
      let itemSearch_recvJson: { Pagination: { ResultsTotal: number }; Results: { Name: string, ID: number }[] }
      ctx.http.get(itemSearch_url).then((response) => {
        itemSearch_recvJson = response
      }).then(async () => {
        if (itemSearch_recvJson.Pagination.ResultsTotal == 0) {
          session.send('未查询到包含\'' + input + '\'的物品,你确定市场上有卖吗？');
        } else if (itemSearch_recvJson.Pagination.ResultsTotal == 1) {
          session.send(itemSearch_recvJson.Results[0].Name + " - " + options.server + '价格查询中');
          itemId = itemSearch_recvJson.Results[0].ID;
          itemName = itemSearch_recvJson.Results[0].Name;
          getPrices(ctx, session, itemId, itemName, options, itemName);
        } else {
          let menu = '';
          let resultsTotal = '';
          let count = 0;
          resultsTotal += itemSearch_recvJson.Pagination.ResultsTotal;
          if (Number(resultsTotal) <= 250) {
            menu += '查询到' + itemSearch_recvJson.Pagination.ResultsTotal + '个包含\' ' + input + ' \'的结果,请输入序号\n';
            for (let i = 0; i < itemSearch_recvJson.Pagination.ResultsTotal; i++) {
              if ((i + 1) < 10) { menu += ' '; }
              if ((i + 1) % 2 == 0) { menu += '    '; }
              menu += i + 1;
              menu += '  ';
              menu += itemSearch_recvJson.Results[i].Name;
              if ((i + 1) % 2 == 0) { menu += '\n' }
              count++;
            }
            session.send(menu);
            let num = await session.prompt();
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
              getPrices(ctx, session, itemId, itemName, options, itemName);
            }
          }
        }
      })
    })

  ctx.command('查历史')
    .alias('/查历史').alias('cls')
    .option('server', '-s <server> 目标服务器', { fallback: config.DataCenter.Server })
    .option('entriesToReturn', '-l <entriesToReturn> 结果行数', { fallback: config.EntriesToReturn })
    .example('查历史 巨匠药酒 -s 猫小胖 -e 20 -min 100 -max 400 解释：查询猫小胖服巨匠药酒最近20条在100到400金币的交易数据')
    .action(({ session, options }, input) => {
      if (!input?.trim()) {
        return session.execute('help 查历史');
      }
      let itemId: number;
      let itemName: string;
      let itemSearch_url: string;
      let reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
      if (reg.test(config.DataCenter.Server)) {
        itemSearch_url = "https://cafemaker.wakingsands.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
      } else {
        itemSearch_url = "https://xivapi.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
      }
      let itemSearch_recvJson: { Pagination: { ResultsTotal: number }; Results: { Name: string, ID: number }[] }
      ctx.http.get(itemSearch_url).then((response) => {
        itemSearch_recvJson = response
      }).then(async () => {
        if (itemSearch_recvJson.Pagination.ResultsTotal == 0) {
          session.send('未查询到包含\'' + input + '\'的物品,你确定市场上有卖吗？');
        } else if (itemSearch_recvJson.Pagination.ResultsTotal == 1) {
          session.send(itemSearch_recvJson.Results[0].Name + " - " + options.server + '交易历史查询中');
          itemId = itemSearch_recvJson.Results[0].ID;
          itemName = itemSearch_recvJson.Results[0].Name;
          getHistory(ctx, session, itemId, itemName, options);
        } else {
          let menu = '';
          let resultsTotal = '';
          let count = 0;
          resultsTotal += itemSearch_recvJson.Pagination.ResultsTotal;
          if (Number(resultsTotal) <= 250) {
            menu += '查询到' + itemSearch_recvJson.Pagination.ResultsTotal + '个包含\' ' + input + ' \'的结果,请输入序号\n';
            for (let i = 0; i < itemSearch_recvJson.Pagination.ResultsTotal; i++) {
              if ((i + 1) < 10) { menu += ' '; }
              if ((i + 1) % 2 == 0) { menu += '    '; }
              menu += i + 1;
              menu += '  ';
              menu += itemSearch_recvJson.Results[i].Name;
              if ((i + 1) % 2 == 0) { menu += '\n' }
              count++;
            }
            session.send(menu);
            let num = await session.prompt();
            if (!num) {
              session.send('不搭理我,我走了');
            } else if (isNaN(Number(num)) || num.indexOf('.') > -1) {
              session.send('麻烦你输入序号,你再好好想想,我先走了');
            } else if (Number(num) <= 0 || Number(num) > count + 1) {
              session.send('序号就这几个,你再好好想想,我先走了');
            } else {
              session.send(itemSearch_recvJson.Results[Number(num) - 1].Name + " - " + options.server + '交易历史查询中');
              itemId = itemSearch_recvJson.Results[Number(num) - 1].ID
              itemName = itemSearch_recvJson.Results[Number(num) - 1].Name;
              getHistory(ctx, session, itemId, itemName, options);
            }
          }
        }
      })
    })
}

async function getPrices(ctx: Context, session, itemId: number, itemName: string, options: any, input: string) {
  let server = options.server;
  let gst = options.gst;
  let limit = options.limit;
  let universalis = 'https://universalis.app/api/v2/' + encodeURI(server) + '/' + itemId + '?noGst=' + gst + '&fields=listings.lastReviewTime%2Clistings.pricePerUnit%2Clistings.quantity%2Clistings.worldName%2Clistings.hq';
  var universalis_recvJson;
  let backmessage = itemName + "  -  " + options.server + '    市场价格\n';
  let lastTime: string;
  await ctx.http.get(universalis).then((response) => {
    universalis_recvJson = response;
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
  var itemList: Array<Item>, pricesList: Array<Item>, hisList: Array<Item>;
  let hqPricesList: Array<Item> = [], nqPricesList: Array<Item> = [];
  let delCount = 0;
  if (universalis_recvJson != null && universalis_recvJson != undefined) {
    if (universalis_recvJson.listings.length != 0) {
      lastTime = '更新时间:' + new Date(universalis_recvJson.listings[0].lastReviewTime * 1000).toLocaleString() + '\n';
      if (options.isSell) {
        let universalis_His = 'https://universalis.app/api/v2/history/' + encodeURI(server) + '/' + itemId;
        await ctx.http.get(universalis_His).then((response) => {
          hisList = response.entries;
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
        pricesList = universalis_recvJson.listings;
        itemList = isSell(pricesList, hisList);
        delCount = pricesList.length - itemList.length;
        if (itemList.length != 0) {
          for (let i = 0; i < itemList.length; i++) {
            if (itemList[i].hq && itemList[i] != null && itemList != undefined) {
              hqPricesList.push(itemList[i]);
            } else {
              nqPricesList.push(itemList[i]);
            }
          }
        } else {
          backmessage += '当前结果不准确\n';
          for (let i = 0; i < itemList.length; i++) {
            if (itemList[i].hq) {
              hqPricesList[i] = itemList[i];
            } else {
              nqPricesList[i] = itemList[i];
            }
          }
        }
      } else {
        for (let i = 0; i < universalis_recvJson.listings.length; i++) {
          if (universalis_recvJson.listings[i].hq) {
            hqPricesList[i] = universalis_recvJson.listings[i];
          } else {
            nqPricesList[i] = universalis_recvJson.listings[i];
          }
        }
      }
      backmessage += pricesList.length + '个结果 排除' + delCount + '个卖掉的结果\n'
      if (hqPricesList.length != 0) {
        let showHQ = hqPricesList.length < limit ? hqPricesList.length : limit;
        backmessage += 'HQ共' + hqPricesList.length + '个结果，显示' + showHQ + '个\n';
        for (let i = 0; i < showHQ; i++) {
          backmessage += '      '
            + hqPricesList[i].pricePerUnit + '×'
            + hqPricesList[i].quantity + '  '
            + hqPricesList[i].worldName + '\n'
        }
      } else { backmessage += '没有HQ结果\n'; }
      if (nqPricesList.length != 0) {
        let showNQ = nqPricesList.length < limit ? nqPricesList.length : limit;
        backmessage += 'NQ共' + nqPricesList.length + '个结果，显示' + showNQ + '个\n';
        for (let i = 0; i < showNQ; i++) {
          backmessage += '      '
            + nqPricesList[i].pricePerUnit + '×'
            + nqPricesList[i].quantity + '  '
            + nqPricesList[i].worldName + '\n'
        }
      } else { backmessage += '没有NQ结果\n'; }
    } else { backmessage += '没货\n'; }
    //if (options.toBuy) {backmessage += '可以尝试去-  ' + toBuy(itemList) + '  -购买\n';}
    backmessage += lastTime;
    session.send(backmessage);
  } else {
    session.send('universalis服务网络不佳，正在重新尝试');
    session.execute('查价 ' + input);
  }
}

async function getHistory(ctx: Context, session, itemId: number, itemName: string, options: any) {
  let server = options.server;
  let entriesToReturn = options.entriesToReturn;
  let universalis_His = 'https://universalis.app/api/v2/history/' + encodeURI(server) + '/' + itemId + '?entriesToReturn=' + entriesToReturn;
  var universalis_His_recvJson;
  let backmessage = itemName + "-" + options.server + '    交易历史\n';//qq单条消息字数上限3420
  let lastTime: string;
  await ctx.http.get(universalis_His).then((response) => {
    universalis_His_recvJson = response;
    lastTime = '更新时间:  ' + new Date(universalis_His_recvJson.lastUploadTime).toLocaleString() + '\n';
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
  //判断交易价格是否与默认设置价格相等
  var hisList: Array<Item> = [];
  if (universalis_His_recvJson.entries.length != 0) {
    backmessage += "最近" + universalis_His_recvJson.entries.length + '条交易：\n'
    for (let i = 0; i < universalis_His_recvJson.entries.length; i++) {
      backmessage += new Date(universalis_His_recvJson.entries[i].timestamp * 1000).toLocaleString().slice(5, 19) + ' '
        + universalis_His_recvJson.entries[i].worldName + ' '
        + universalis_His_recvJson.entries[i].pricePerUnit + '×'
        + universalis_His_recvJson.entries[i].quantity + '\n'
    }
  } else {
    backmessage += '\n最近没有交易记录';
    backmessage += lastTime;
  }
  backmessage += lastTime;
  session.send(backmessage);
}

interface Item {
  worldName: string,
  pricePerUnit: number,
  quantity: number
  hq: boolean,
  lastReviewTime: number
  timestamp: number
}

function isSell(pricesList: Array<Item>, hisList: Array<Item>): Array<Item> {
  return pricesList.filter(priceItem =>
    !hisList.some(histItem =>
      priceItem.worldName === histItem.worldName &&
      priceItem.pricePerUnit === histItem.pricePerUnit &&
      priceItem.quantity === histItem.quantity &&
      priceItem.hq === histItem.hq &&
      priceItem.lastReviewTime < histItem.timestamp
    )
  );
}

function toBuy(buyList: Item[]) {//只考虑了数量，没有考虑低价，
  const worldNameCount: { [key: string]: number } = {};
  buyList.forEach(item => {
    if (worldNameCount[item.worldName]) {
      worldNameCount[item.worldName]++;
    } else {
      worldNameCount[item.worldName] = 1;
    }
  });
  let maxWorldName = '';
  let maxCount = 0;
  for (const worldName in worldNameCount) {
    if (worldNameCount[worldName] > maxCount) {
      maxCount = worldNameCount[worldName];
      maxWorldName = worldName;
    }
  }
  return maxWorldName;
}
//添加只查询HQ或NQ的功能 -h -n
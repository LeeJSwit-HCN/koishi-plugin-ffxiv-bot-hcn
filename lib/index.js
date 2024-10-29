var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  apply: () => apply,
  name: () => name,
  schema: () => schema,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "ffxiv-bot-hcn";
var usage = "指令：查价 <物品名>";
var schema = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    DataCenter: import_koishi.Schema.union([
      import_koishi.Schema.object({
        Server: import_koishi.Schema.union(["陆行鸟", "莫古力", "猫小胖", "豆豆柴"]).description("服区").required()
      }).description("China"),
      import_koishi.Schema.object({
        Server: import_koishi.Schema.union(["Elemental", "Gaia", "Mana", "Meteor"]).description("服区").required()
      }).description("Japan"),
      import_koishi.Schema.object({
        Server: import_koishi.Schema.union(["Aether", "Primal", "Crystal", "Dynamis"]).description("服区").required()
      }).description("North-America"),
      import_koishi.Schema.object({
        Server: import_koishi.Schema.union(["Chaos", "Light"]).description("服区").required()
      }).description("Europe"),
      import_koishi.Schema.object({
        Server: import_koishi.Schema.string().pattern(/^Materia$/i).default("Materia").description("服区").required()
      }).description("Oceania")
    ]).description("数据中心").required()
  }).description("服区设置"),
  import_koishi.Schema.object({
    Limit: import_koishi.Schema.number().role("slider").min(3).max(20).step(1).default(5).description("查价结果行数"),
    HQ: import_koishi.Schema.boolean().default(true).description("结果区分HQ"),
    Gst: import_koishi.Schema.boolean().default(true).description("自动计算税后价")
  }).description("查价设置"),
  //添加最大重新尝试次数
  import_koishi.Schema.object({
    EntriesToReturn: import_koishi.Schema.number().role("slider").min(5).max(100).step(1).default(10).description("查历史结果行数")
  }).description("查历史设置")
]);
function apply(ctx, config) {
  ctx.command("查价").alias("/查价").alias("cj").option("server", "-s <server> 目标服务器", { fallback: config.DataCenter.Server }).option("limit", "-l <limit> 结果行数", { fallback: config.Limit }).option("gst", "-g 输出税后价格", { fallback: config.Gst }).option("buyCount", "-b <buyCount> 预计购买数量", { fallback: config.BuyCount }).option("onlyHq", "-o 只看HQ", { fallback: config.onlyHq }).example("查价 巨匠药酒 -s 猫小胖 -l 20 -g 解释：查询猫小胖服巨匠药酒20条税后价格数据").action(({ session, options }, input) => {
    if (!input?.trim()) {
      return session.execute("help 查价");
    }
    let itemId;
    let itemName;
    let itemSearch_url;
    let allow = true;
    let reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
    if (reg.test(config.DataCenter.Server)) {
      itemSearch_url = "https://cafemaker.wakingsands.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,LevelItem,Name&sort_field=ID&sort_order=desc";
    } else {
      itemSearch_url = "https://xivapi.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,LevelItem,Name&limit=500&sort_field=ID&sort_order=desc";
    }
    let itemSearch_recvJson;
    if (options.limit != void 0) {
      if (options.limit < 0 && isInteger(options.limit)) {
        session.send("选项 limit 输入无效，请提供一个正整数。");
        allow = false;
      } else if (!isInteger(options.limit)) {
        session.send("选项 limit 输入无效，请提供一个正整数\n再输入小数看我打不死你！");
        allow = false;
      }
    }
    if (options.buyCount != void 0) {
      if (options.buyCount < 1 || options.buyCount > 99 || !isInteger(options.buyCount)) {
        session.send("选项 buyCount 输入无效，请提供一个在1到99之间的正整数。");
        allow = false;
      }
    }
    if (allow) {
      ctx.http.get(itemSearch_url).then((response) => {
        itemSearch_recvJson = response;
      }).then(async () => {
        if (itemSearch_recvJson.Pagination.ResultsTotal == 0) {
          session.send("未查询到包含'" + input + "'的物品,你确定市场上有卖吗？");
        } else if (itemSearch_recvJson.Pagination.ResultsTotal == 1) {
          session.send(itemSearch_recvJson.Results[0].Name + " - " + options.server + "价格查询中");
          itemId = itemSearch_recvJson.Results[0].ID;
          itemName = itemSearch_recvJson.Results[0].Name;
          getPrices(ctx, config, session, itemId, itemName, options, itemName);
        } else {
          let menuMidList = [];
          let resultsTotal = Number(itemSearch_recvJson.Pagination.ResultsTotal);
          let menu = "查询到" + resultsTotal + "个包含' " + input + " '的结果\n请输入序号:\n";
          ;
          for (let i = 0; i < resultsTotal; i++) {
            let menuMid = { ID: 0, Name: "", LevelItem: 0, Length: 0 };
            menuMid.ID = itemSearch_recvJson.Results[i].ID;
            menuMid.Name = itemSearch_recvJson.Results[i].Name;
            menuMid.LevelItem = itemSearch_recvJson.Results[i].LevelItem;
            menuMid.Length = itemSearch_recvJson.Results[i].Name.length * 2;
            menuMidList.push(menuMid);
          }
          menuMidList.sort((a, b) => {
            if (a.Length !== b.Length) {
              return a.Length - b.Length;
            }
            if (a.LevelItem !== b.LevelItem) {
              return b.LevelItem - a.LevelItem;
            }
            return b.ID - a.ID;
          });
          console.log(menuMidList);
          for (let i = 0; i <= menuMidList.length - 1; i++) {
            if (i != menuMidList.length - 1) {
              if (i < 9) {
                if (menuMidList[i].Length + menuMidList[i + 1].Length < 24) {
                  menu += ` ${i + 1} ${menuMidList[i].Name}   ${i + 2} ${menuMidList[i + 1].Name}
`;
                  i++;
                } else {
                  menu += ` ${i + 1} ${menuMidList[i].Name}
`;
                }
              } else {
                if (menuMidList[i].Length + menuMidList[i + 1].Length < 24) {
                  menu += `${i + 1} ${menuMidList[i].Name}  ${i + 2} ${menuMidList[i + 1].Name}
`;
                  i++;
                } else {
                  menu += `${i + 1} ${menuMidList[i].Name}
`;
                }
              }
            } else {
              menu += `${i + 1} ${menuMidList[i].Name}
`;
            }
          }
          session.send(menu);
          let num = await session.prompt();
          if (!num) {
            session.send("不搭理我,我走了");
          } else if (isNaN(Number(num)) || num.indexOf(".") > -1) {
            session.send("麻烦你输入序号,你再好好想想,我先走了");
          } else if (Number(num) <= 0 || Number(num) > resultsTotal + 1) {
            session.send("序号就这几个,你再好好想想,我先走了");
          } else {
            session.send(itemSearch_recvJson.Results[Number(num) - 1].Name + " - " + options.server + "价格查询中");
            itemId = itemSearch_recvJson.Results[Number(num) - 1].ID;
            itemName = itemSearch_recvJson.Results[Number(num) - 1].Name;
            getPrices(ctx, config, session, itemId, itemName, options, itemName);
          }
        }
      });
    }
  });
  ctx.command("查历史").alias("/查历史").alias("cls").option("server", "-s <server> 目标服务器", { fallback: config.DataCenter.Server }).option("entriesToReturn", "-l <entriesToReturn> 结果行数", { fallback: config.EntriesToReturn }).example("查历史 巨匠药酒 -s 猫小胖 -e 20 -min 100 -max 400 解释：查询猫小胖服巨匠药酒最近20条在100到400金币的交易数据").action(({ session, options }, input) => {
    if (!input?.trim()) {
      return session.execute("help 查历史");
    }
    let itemId;
    let itemName;
    let itemSearch_url;
    let reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
    if (reg.test(config.DataCenter.Server)) {
      itemSearch_url = "https://cafemaker.wakingsands.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
    } else {
      itemSearch_url = "https://xivapi.com/search?string=" + encodeURI(input) + "&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc";
    }
    let itemSearch_recvJson;
    ctx.http.get(itemSearch_url).then((response) => {
      itemSearch_recvJson = response;
    }).then(async () => {
      if (itemSearch_recvJson.Pagination.ResultsTotal == 0) {
        session.send("未查询到包含'" + input + "'的物品,你确定市场上有卖吗？");
      } else if (itemSearch_recvJson.Pagination.ResultsTotal == 1) {
        session.send(itemSearch_recvJson.Results[0].Name + " - " + options.server + "交易历史查询中");
        itemId = itemSearch_recvJson.Results[0].ID;
        itemName = itemSearch_recvJson.Results[0].Name;
        getHistory(ctx, session, itemId, itemName, options, input);
      } else {
        let menu = "";
        let resultsTotal = "";
        let count = 0;
        resultsTotal += itemSearch_recvJson.Pagination.ResultsTotal;
        if (Number(resultsTotal) <= 250) {
          menu += "查询到" + itemSearch_recvJson.Pagination.ResultsTotal + "个包含' " + input + " '的结果,请输入序号\n";
          for (let i = 0; i < itemSearch_recvJson.Pagination.ResultsTotal; i++) {
            if (i + 1 < 10) {
              menu += " ";
            }
            if ((i + 1) % 2 == 0) {
              menu += "    ";
            }
            menu += i + 1;
            menu += "  ";
            menu += itemSearch_recvJson.Results[i].Name;
            if ((i + 1) % 2 == 0) {
              menu += "\n";
            }
            count++;
          }
          session.send(menu);
          let num = await session.prompt();
          if (!num) {
            session.send("不搭理我,我走了");
          } else if (isNaN(Number(num)) || num.indexOf(".") > -1) {
            session.send("麻烦你输入序号,你再好好想想,我先走了");
          } else if (Number(num) <= 0 || Number(num) > count + 1) {
            session.send("序号就这几个,你再好好想想,我先走了");
          } else {
            session.send(itemSearch_recvJson.Results[Number(num) - 1].Name + " - " + options.server + "交易历史查询中");
            itemId = itemSearch_recvJson.Results[Number(num) - 1].ID;
            itemName = itemSearch_recvJson.Results[Number(num) - 1].Name;
            getHistory(ctx, session, itemId, itemName, options, input);
          }
        }
      }
    });
  });
}
__name(apply, "apply");
async function getPrices(ctx, config, session, itemId, itemName, options, input) {
  let server = options.server;
  let gst = options.gst;
  let limit = options.limit;
  let universalis = "https://universalis.app/api/v2/" + encodeURI(server) + "/" + itemId + "?noGst=" + gst + "&fields=listings.lastReviewTime%2Clistings.pricePerUnit%2Clistings.quantity%2Clistings.worldName%2Clistings.hq%2Clistings.total";
  var universalis_recvJson;
  let backmessage, errorMes, titleMes, timeMes, countMes, priMes, hqMes, nqMes, sugMes, detailMes;
  await ctx.http.get(universalis).then((response) => {
    universalis_recvJson = response;
  }).catch((error) => {
    if (error.response) {
      switch (error.response.status) {
        case 500:
          errorMes = "Universalis服务异常,请稍后再试";
          break;
        case 501:
          errorMes = "Universalis服务异常,请稍后再试";
          break;
        case 502:
          errorMes = "Universalis服务异常,请稍后再试";
          break;
        case 503:
          errorMes = "Universalis服务异常,请稍后再试";
          break;
        case 504:
          errorMes = "Universalis服务异常,请稍后再试";
          break;
        case 404:
          errorMes = "The world/DC or item requested is invalid. When requesting multiple items at once, an invalid item ID will not trigger this. Instead, the returned list of unresolved item IDs will contain the invalid item ID or IDs.";
          break;
        case 400:
          errorMes = "The parameters were invalid.";
          break;
      }
    } else if (error.request) {
      errorMes = "网络请求失败,请联系管理员";
    }
    session.send(errorMes);
  });
  if ((itemName + " - " + options.server).length > 10) {
    titleMes = itemName + " - " + options.server + "\n";
  } else {
    titleMes = itemName + " - " + options.server + " 市场价格\n";
  }
  var itemList = [], pricesList = [], hisList = [];
  let hqPricesList = [], nqPricesList = [];
  let delCount = 0;
  if (universalis_recvJson != null && universalis_recvJson != void 0) {
    if (universalis_recvJson.listings.length != 0) {
      timeMes = "更新时间:" + new Date(universalis_recvJson.listings[0].lastReviewTime * 1e3).toLocaleString();
      let universalis_His = "https://universalis.app/api/v2/history/" + encodeURI(server) + "/" + itemId;
      await ctx.http.get(universalis_His).then((response) => {
        hisList = response.entries;
      }).catch((error) => {
        if (error.response) {
          switch (error.response.status) {
            case 500:
              titleMes = "Universalis服务异常,请稍后再试";
              break;
            case 501:
              titleMes = "Universalis服务异常,请稍后再试";
              break;
            case 502:
              titleMes = "Universalis服务异常,请稍后再试";
              break;
            case 503:
              titleMes = "Universalis服务异常,请稍后再试";
              break;
            case 504:
              titleMes = "Universalis服务异常,请稍后再试";
              break;
            case 404:
              titleMes = "The world/DC or item requested is invalid. When requesting multiple items at once, an invalid item ID will not trigger this. Instead, the returned list of unresolved item IDs will contain the invalid item ID or IDs.";
              break;
            case 400:
              titleMes = "The parameters were invalid.";
              break;
          }
        } else if (error.request) {
          titleMes = "网络请求失败,请联系管理员";
        }
      });
      pricesList = universalis_recvJson.listings;
      itemList = isSell(pricesList, hisList);
      delCount = pricesList.length - itemList.length;
      if (itemList.length != 0) {
        for (let i = 0; i < itemList.length; i++) {
          if (itemList[i].hq && itemList[i] != null && itemList != void 0) {
            hqPricesList.push(itemList[i]);
          } else {
            nqPricesList.push(itemList[i]);
          }
        }
      }
      countMes = `共${pricesList.length}个结果，排除${delCount}个失效结果
`;
      if (itemList.length !== 0) {
        priMes = formatPriceList(itemList, "", itemList.length, options);
      }
      if (hqPricesList.length !== 0) {
        hqMes = formatPriceList(hqPricesList, "HQ", limit, options);
      }
      ;
      if (nqPricesList.length !== 0) {
        nqMes = formatPriceList(nqPricesList, "NQ", limit, options);
      }
      ;
    } else {
      countMes += "没货\n";
    }
    if (config.HQ) {
      if (options.onlyHq) {
        backmessage = titleMes + countMes + hqMes + timeMes;
      } else {
        backmessage = titleMes + countMes + hqMes + nqMes + timeMes;
      }
    } else {
      backmessage = titleMes + countMes + priMes + timeMes;
    }
    session.send(backmessage);
  } else {
    session.send("universalis服务网络不佳，正在重新尝试");
    session.execute("查价 " + input + " -s " + options.server + " -l " + options.limit);
  }
}
__name(getPrices, "getPrices");
async function getHistory(ctx, session, itemId, itemName, options, input) {
  let server = options.server;
  let entriesToReturn = options.entriesToReturn;
  let universalis_His = "https://universalis.app/api/v2/history/" + encodeURI(server) + "/" + itemId + "?entriesToReturn=" + entriesToReturn;
  var universalis_His_recvJson;
  let backmessage = itemName + "-" + options.server + "\n";
  let lastTime;
  await ctx.http.get(universalis_His).then((response) => {
    universalis_His_recvJson = response;
    lastTime = "更新时间:  " + new Date(universalis_His_recvJson.lastUploadTime).toLocaleString() + "\n";
  }).catch((error) => {
    if (error.response) {
      switch (error.response.status) {
        case 500:
          backmessage = "Universalis服务异常,请稍后再试";
          break;
        case 501:
          backmessage = "Universalis服务异常,请稍后再试";
          break;
        case 502:
          backmessage = "Universalis服务异常,请稍后再试";
          break;
        case 503:
          backmessage = "Universalis服务异常,请稍后再试";
          break;
        case 504:
          backmessage = "Universalis服务异常,请稍后再试";
          break;
        case 404:
          backmessage = "The world/DC or item requested is invalid. When requesting multiple items at once, an invalid item ID will not trigger this. Instead, the returned list of unresolved item IDs will contain the invalid item ID or IDs.";
          break;
        case 400:
          backmessage = "The parameters were invalid.";
          break;
      }
    } else if (error.request) {
      backmessage = "网络请求失败,请联系管理员";
    }
  });
  backmessage += "成交平均价：" + universalis_His_recvJson.regularSaleVelocity + "\n";
  if (universalis_His_recvJson != null && universalis_His_recvJson != void 0) {
    if (universalis_His_recvJson.entries.length != 0) {
      backmessage += "最近" + universalis_His_recvJson.entries.length + "条交易：\n";
      for (let i = 0; i < universalis_His_recvJson.entries.length; i++) {
        if (universalis_His_recvJson.entries[i].worldName == void 0) {
          universalis_His_recvJson.entries[i].worldName = options.server;
        }
        backmessage += new Date(universalis_His_recvJson.entries[i].timestamp * 1e3).toLocaleString().slice(5, 19) + " " + universalis_His_recvJson.entries[i].worldName + " " + universalis_His_recvJson.entries[i].pricePerUnit + "×" + universalis_His_recvJson.entries[i].quantity + "\n";
      }
    } else {
      backmessage += "\n最近没有交易记录";
      backmessage += lastTime;
    }
  } else {
    session.send("universalis服务网络不佳，正在重新尝试");
    session.execute("查历史 " + input + " -s " + options.server + " -l " + options.limit);
  }
  backmessage += lastTime;
  session.send(backmessage);
}
__name(getHistory, "getHistory");
function formatPriceList(priceList, label, limit, options) {
  if (priceList.length === 0) {
    return `没有${label}结果
`;
  }
  let showCount = Math.min(priceList.length, limit);
  let message = `${label}共${priceList.length}个结果，显示${showCount}个
`;
  let maxLen = Math.max(...priceList.map((item) => (item.pricePerUnit + "×" + item.quantity).length));
  for (let i = 0; i < showCount; i++) {
    let item = priceList[i];
    if (!item.worldName) item.worldName = options.server;
    let priQu = item.pricePerUnit + "×" + item.quantity;
    message += `  ${priQu.padEnd(maxLen * 2 - priQu.length)}  ${item.worldName}
`;
  }
  return message;
}
__name(formatPriceList, "formatPriceList");
function isSell(pricesList, hisList) {
  return pricesList.filter(
    (priceItem) => !hisList.some(
      (histItem) => priceItem.worldName === histItem.worldName && priceItem.pricePerUnit === histItem.pricePerUnit && priceItem.quantity === histItem.quantity && priceItem.hq === histItem.hq && priceItem.lastReviewTime < histItem.timestamp
    )
  );
}
__name(isSell, "isSell");
function isInteger(value) {
  return Math.floor(value) === value;
}
__name(isInteger, "isInteger");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  apply,
  name,
  schema,
  usage
});

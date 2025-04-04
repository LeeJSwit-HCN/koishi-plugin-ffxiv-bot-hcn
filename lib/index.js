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
  import_koishi.Schema.object({
    EntriesToReturn: import_koishi.Schema.number().role("slider").min(5).max(100).step(1).default(10).description("查历史结果行数")
  }).description("查历史设置")
]);
function getErrorMessage(status) {
  switch (status) {
    case 400:
      return "请求参数无效。";
    case 404:
      return "请求的世界/DC或物品不存在。";
    case 500:
    case 501:
    case 502:
    case 503:
    case 504:
      return "Universalis服务异常,请稍后再试。";
    default:
      return "网络请求失败,请联系管理员。";
  }
}
__name(getErrorMessage, "getErrorMessage");
function isInteger(value) {
  return Math.floor(value) === value;
}
__name(isInteger, "isInteger");
function apply(ctx, config) {
  ctx.command("查价").alias("/查价").alias("cj").option("server", "-s <server> 目标服务器", { fallback: config.DataCenter.Server }).option("limit", "-l <limit> 结果行数", { fallback: config.Limit }).option("gst", "-g 输出税后价格", { fallback: config.Gst }).option("buyCount", "-b <buyCount> 预计购买数量", { fallback: config.BuyCount }).option("onlyHq", "-o 只看HQ", { fallback: config.onlyHq }).example("查价 巨匠药酒 -s 猫小胖 -l 20 -g 解释：查询猫小胖服巨匠药酒20条税后价格数据").action(async ({ session, options }, input) => {
    if (!input?.trim()) return session.execute("help 查价");
    if (options.limit !== void 0) {
      if (options.limit <= 0 || !isInteger(options.limit)) {
        session.send("选项 limit 输入无效，请提供一个正整数。");
        return;
      }
    }
    if (options.buyCount !== void 0) {
      if (options.buyCount < 1 || options.buyCount > 99 || !isInteger(options.buyCount)) {
        session.send("选项 buyCount 输入无效，请提供一个在1到99之间的正整数。");
        return;
      }
    }
    const isChineseServer = /[\u4E00-\u9FFF]/.test(config.DataCenter.Server);
    const itemSearch_url = isChineseServer ? `https://cafemaker.wakingsands.com/search?string=${encodeURI(input)}&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,LevelItem,Name&sort_field=ID&sort_order=desc` : `https://xivapi.com/search?string=${encodeURI(input)}&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,LevelItem,Name&limit=500&sort_field=ID&sort_order=desc`;
    let itemSearch_recvJson;
    try {
      itemSearch_recvJson = await ctx.http.get(itemSearch_url);
    } catch (error) {
      session.send(getErrorMessage(error.response?.status));
      return;
    }
    let allResults = itemSearch_recvJson.Results;
    const pagination = itemSearch_recvJson.Pagination;
    if (pagination.PageTotal > 1) {
      for (let page = 2; page <= pagination.PageTotal; page++) {
        try {
          const pageResp = await ctx.http.get(itemSearch_url + `&Page=${page}`);
          allResults = allResults.concat(pageResp.Results);
        } catch (error) {
          session.send(`第${page}页数据请求失败：` + getErrorMessage(error.response?.status));
        }
      }
    }
    const resultsTotal = pagination.ResultsTotal;
    if (resultsTotal === 0) {
      session.send(`未查询到包含 '${input}' 的物品,你确定市场上有卖吗？`);
    } else if (resultsTotal === 1) {
      const result = allResults[0];
      session.send(`${result.Name} - ${options.server} 价格查询中`);
      await getPrices(ctx, config, session, result.ID, result.Name, options, input);
    } else {
      const menuMidList = allResults.map((result) => ({
        ID: result.ID,
        Name: result.Name,
        LevelItem: result.LevelItem,
        Length: result.Name.length * 2
      }));
      menuMidList.sort((a, b) => {
        if (a.Length !== b.Length) return a.Length - b.Length;
        if (a.LevelItem !== b.LevelItem) return b.LevelItem - a.LevelItem;
        return b.ID - a.ID;
      });
      let menu = `查询到${resultsTotal}个包含 '${input}' 的结果
请输入序号:
`;
      for (let i = 0; i < menuMidList.length; i++) {
        if (i < menuMidList.length - 1 && menuMidList[i].Length + menuMidList[i + 1].Length < 24) {
          menu += ` ${i + 1} ${menuMidList[i].Name}   ${i + 2} ${menuMidList[i + 1].Name}
`;
          i++;
        } else {
          menu += ` ${i + 1} ${menuMidList[i].Name}
`;
        }
      }
      session.send(menu);
      const num = await session.prompt();
      if (!num) {
        session.send("不搭理我,我走了");
        return;
      }
      if (isNaN(Number(num)) || num.indexOf(".") > -1) {
        session.send("麻烦你输入序号,我先走了");
        return;
      }
      const index = Number(num) - 1;
      if (index < 0 || index >= allResults.length) {
        session.send("序号超出范围,我先走了");
        return;
      }
      const selected = allResults[index];
      session.send(`${selected.Name} - ${options.server} 价格查询中`);
      await getPrices(ctx, config, session, selected.ID, selected.Name, options, input);
    }
  });
  ctx.command("查历史").alias("/查历史").alias("cls").option("server", "-s <server> 目标服务器", { fallback: config.DataCenter.Server }).option("entriesToReturn", "-l <entriesToReturn> 结果行数", { fallback: config.EntriesToReturn }).example("查历史 巨匠药酒 -s 猫小胖 -e 20 -min 100 -max 400 解释：查询猫小胖服巨匠药酒最近20条在100到400金币的交易数据").action(async ({ session, options }, input) => {
    if (!input?.trim()) return session.execute("help 查历史");
    const isChineseServer = /[\u4E00-\u9FFF]/.test(config.DataCenter.Server);
    const itemSearch_url = isChineseServer ? `https://cafemaker.wakingsands.com/search?string=${encodeURI(input)}&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc` : `https://xivapi.com/search?string=${encodeURI(input)}&indexes=item&language=chs&filters=ItemSearchCategory.ID%3E=1&columns=ID,Name,LevelItem&limit=500&sort_field=LevelItem&sort_order=desc`;
    let itemSearch_recvJson;
    try {
      itemSearch_recvJson = await ctx.http.get(itemSearch_url);
    } catch (error) {
      session.send(getErrorMessage(error.response?.status));
      return;
    }
    const resultsTotal = itemSearch_recvJson.Pagination.ResultsTotal;
    if (resultsTotal === 0) {
      session.send(`未查询到包含 '${input}' 的物品,你确定市场上有卖吗？`);
    } else if (resultsTotal === 1) {
      const result = itemSearch_recvJson.Results[0];
      session.send(`${result.Name} - ${options.server} 交易历史查询中`);
      await getHistory(ctx, session, result.ID, result.Name, options, input);
    } else {
      let menu = `查询到${resultsTotal}个包含 '${input}' 的结果, 请输入序号
`;
      for (let i = 0; i < resultsTotal; i++) {
        menu += (i + 1 < 10 ? " " : "") + (i + 1) + "  " + itemSearch_recvJson.Results[i].Name;
        menu += i % 2 === 1 ? "\n" : "    ";
      }
      session.send(menu);
      const num = await session.prompt();
      if (!num) {
        session.send("不搭理我,我走了");
        return;
      }
      if (isNaN(Number(num)) || num.indexOf(".") > -1) {
        session.send("麻烦你输入序号,我先走了");
        return;
      }
      const index = Number(num) - 1;
      if (index < 0 || index >= resultsTotal) {
        session.send("序号超出范围,我先走了");
        return;
      }
      const selected = itemSearch_recvJson.Results[index];
      session.send(`${selected.Name} - ${options.server} 交易历史查询中`);
      await getHistory(ctx, session, selected.ID, selected.Name, options, input);
    }
  });
}
__name(apply, "apply");
async function getPrices(ctx, config, session, itemId, itemName, options, input) {
  const server = options.server;
  const gst = options.gst;
  const limit = options.limit;
  const universalisUrl = `https://universalis.app/api/v2/${encodeURI(server)}/${itemId}?noGst=${gst}&fields=listings.lastReviewTime%2Clistings.pricePerUnit%2Clistings.quantity%2Clistings.worldName%2Clistings.hq%2Clistings.total`;
  let universalis_recvJson;
  try {
    universalis_recvJson = await ctx.http.get(universalisUrl);
  } catch (error) {
    session.send(getErrorMessage(error.response?.status));
    return;
  }
  let titleMes = (itemName + " - " + options.server).length > 10 ? `${itemName} - ${options.server}
` : `${itemName} - ${options.server} 市场价格
`;
  let timeMes = "", countMes = "";
  let pricesList = [], hisList = [];
  let hqPricesList = [], nqPricesList = [];
  if (universalis_recvJson && universalis_recvJson.listings.length) {
    timeMes = "更新时间: " + new Date(universalis_recvJson.listings[0].lastReviewTime * 1e3).toLocaleString();
    const universalisHisUrl = `https://universalis.app/api/v2/history/${encodeURI(server)}/${itemId}`;
    try {
      const hisResp = await ctx.http.get(universalisHisUrl);
      hisList = hisResp.entries;
    } catch (error) {
      titleMes = getErrorMessage(error.response?.status);
    }
    pricesList = universalis_recvJson.listings;
    const itemList = isSell(pricesList, hisList);
    const delCount = pricesList.length - itemList.length;
    itemList.forEach((item) => {
      if (item.hq) hqPricesList.push(item);
      else nqPricesList.push(item);
    });
    countMes = `共${pricesList.length}个结果，排除${delCount}个失效结果
`;
    const priMes = itemList.length ? formatPriceList(itemList, "", itemList.length, options) : "";
    const hqMes = hqPricesList.length ? formatPriceList(hqPricesList, "HQ", limit, options) : "";
    const nqMes = nqPricesList.length ? formatPriceList(nqPricesList, "NQ", limit, options) : "";
    const backmessage = config.HQ ? options.onlyHq ? titleMes + countMes + hqMes + timeMes : titleMes + countMes + hqMes + nqMes + timeMes : titleMes + countMes + priMes + timeMes;
    session.send(backmessage);
  } else {
    session.send("universalis服务网络不佳，正在重新尝试");
    session.execute(`查价 ${input} -s ${options.server} -l ${options.limit}`);
  }
}
__name(getPrices, "getPrices");
async function getHistory(ctx, session, itemId, itemName, options, input) {
  const server = options.server;
  const entriesToReturn = options.entriesToReturn;
  const universalisHisUrl = `https://universalis.app/api/v2/history/${encodeURI(server)}/${itemId}?entriesToReturn=${entriesToReturn}`;
  let universalis_His_recvJson;
  let backmessage = `${itemName} - ${options.server}
`;
  let lastTime = "";
  try {
    universalis_His_recvJson = await ctx.http.get(universalisHisUrl);
    lastTime = "更新时间: " + new Date(universalis_His_recvJson.lastUploadTime).toLocaleString() + "\n";
  } catch (error) {
    backmessage = getErrorMessage(error.response?.status);
    session.send(backmessage);
    return;
  }
  backmessage += "成交平均价：" + universalis_His_recvJson.regularSaleVelocity + "\n";
  if (universalis_His_recvJson.entries.length) {
    backmessage += "最近" + universalis_His_recvJson.entries.length + "条交易：\n";
    universalis_His_recvJson.entries.forEach((entry) => {
      if (!entry.worldName) entry.worldName = options.server;
      backmessage += new Date(entry.timestamp * 1e3).toLocaleString().slice(5, 19) + " " + entry.worldName + " " + entry.pricePerUnit + "×" + entry.quantity + "\n";
    });
  } else {
    backmessage += "\n最近没有交易记录\n";
  }
  backmessage += lastTime;
  session.send(backmessage);
}
__name(getHistory, "getHistory");
function formatPriceList(priceList, label, limit, options) {
  if (priceList.length === 0) return `没有${label}结果
`;
  const showCount = Math.min(priceList.length, limit);
  let message = `${label}共${priceList.length}个结果，显示${showCount}个
`;
  const maxLen = Math.max(...priceList.map((item) => (item.pricePerUnit + "×" + item.quantity).length));
  for (let i = 0; i < showCount; i++) {
    const item = priceList[i];
    if (!item.worldName) item.worldName = options.server;
    const priQu = item.pricePerUnit + "×" + item.quantity;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  apply,
  name,
  schema,
  usage
});

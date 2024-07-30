import chalk from "chalk";

async function fetchItems() {
  return new Promise(async (resolve, reject) => {
    try {
      const request = await fetch(
        "https://prices.runescape.wiki/api/v1/osrs/latest"
      );
      const items = await request.json();
      resolve(items);
    } catch (err) {
      reject("Did not find items.");
    }
  });
}

async function fetchMapping() {
  return new Promise(async (resolve, reject) => {
    try {
      const request = await fetch(
        "https://prices.runescape.wiki/api/v1/osrs/mapping"
      );
      const items = await request.json();
      resolve(items);
    } catch (err) {
      reject("Did not find mapping.");
    }
  });
}

async function fetchVolumes() {
  return new Promise(async (resolve, reject) => {
    try {
      const request = await fetch(
        "https://prices.runescape.wiki/api/v1/osrs/volumes"
      );
      const items = await request.json();
      resolve(items);
    } catch (err) {
      reject("Did not find volumes.");
    }
  });
}

function filterItemsByPrice(items, priceMax, priceMin) {
  let filteredItems = [];
  for (const [key, val] of Object.entries(items.data)) {
    if (val.high < priceMax && val.high > priceMin) {
      filteredItems.push({ itemID: key, data: val });
    }
  }

  return filteredItems;
}

function filterItemsByVolume(items, itemVolumes, volume) {
  return items.filter((item) => {
    return itemVolumes.data[item.itemID] >= volume;
  });
}

function filterItemsByLastSold(items, hoursAgo) {
  const xHoursAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  return items.filter((item) => {
    const itemLastBuy = new Date(item.data.highTime * 1000);
    const itemLastSell = new Date(item.data.lowTime * 1000);

    // Return items where either buy or sell time is within the last 'hoursAgo' hours
    return itemLastBuy >= xHoursAgo && itemLastSell >= xHoursAgo;
  });
}

function filterItemByProfit(items, wantedProfit) {
  return items
    .map((item) => {
      const itemSellPrice =
        item.data.high -
        (item.data.high * 0.01 > 5000000 ? 5000000 : item.data.high * 0.01);
      const itemBuyPrice = item.data.low;
      const profit = Math.round(itemSellPrice - itemBuyPrice).toLocaleString(
        "en-US"
      );
      return { ...item, profit };
    })
    .filter(
      (item) => parseInt(item.profit.replace(/,/g, ""), 10) >= wantedProfit
    );
}

function mapItemsWithDetails(items, itemMap, itemVolumes) {
  return items.map((item) => {
    const itemData = itemMap.find((data) => {
      return parseInt(data.id, 10) === parseInt(item.itemID, 10);
    });

    return {
      id: itemData.id,
      itemBuyPrice: item.data.low.toLocaleString("en-US"),
      itemSellPrice: item.data.high.toLocaleString("en-US"),
      profit: item.profit,
      limit: itemData.limit,
      name: itemData.name,
      dailyVolume: itemVolumes.data[itemData.id],
    };
  });
}

function sortByMostProfit(items) {
  return items.sort(
    (a, b) =>
      parseInt(a.profit.replace(/,/g, ""), 10) -
      parseInt(b.profit.replace(/,/g, ""), 10)
  );
}

function compareItemsForChange(originalItems, freshItems) {
  const freshItemsMap = new Map();
  freshItems.forEach((freshItem) =>
    freshItemsMap.set(freshItem.name, freshItem.profit)
  );

  for (const item of originalItems) {
    if (
      freshItemsMap.has(item.name) &&
      freshItemsMap.get(item.name) !== item.profit
    ) {
      return true;
    }
  }

  return false;
}

function mapItemsWithPriceChanges(originalItems, freshItems) {
  return freshItems.map((freshItem) => {
    const originalItem = originalItems.find(
      (item) => item.name === freshItem.name
    );
    if (originalItem) {
      if (freshItem.profit !== originalItem.profit) {
        const originalBuyPrice = originalItem.itemBuyPrice;
        const originalSellPrice = originalItem.itemSellPrice;
        const freshBuyPrice = freshItem.itemBuyPrice;
        const freshSellPrice = freshItem.itemSellPrice;
        const originalProfit = originalItem.profit;
        const freshItemProfit = freshItem.profit;

        const itemBuyPriceChange =
          parseInt(originalBuyPrice.replace(/,/g, ""), 10) -
          parseInt(freshBuyPrice.replace(/,/g, ""), 10);

        const itemSellPriceChange =
          parseInt(originalSellPrice.replace(/,/g, ""), 10) -
          parseInt(freshSellPrice.replace(/,/g, ""), 10);

        const itemProfitChange =
          parseInt(freshItemProfit.replace(/,/g, ""), 10) -
          parseInt(originalProfit.replace(/,/g, ""), 10);

        return {
          ...freshItem,
          itemBuyPriceChange: itemBuyPriceChange,
          itemSellPriceChange: itemSellPriceChange,
          itemProfitChange: itemProfitChange,
        };
      }
    }
    return freshItem;
  });
}

function prettyPrint(items) {
  if (items) {
    console.log(
      chalk.red(
        "-------------------------------------------------------------------------------------"
      )
    );
    items.forEach((item) => {
      console.log(
        chalk.blue(
          `------------------------------ ${chalk.underline(
            item.name
          )} ------------------------------`
        )
      );

      console.log(
        "Buy it: ",
        chalk.yellowBright(item.itemBuyPrice),
        ` (${
          "itemBuyPriceChange" in item
            ? item.itemBuyPriceChange === 0
              ? chalk.white(0)
              : item.itemBuyPriceChange > 0
              ? chalk.green(
                  `- ${Math.abs(item.itemBuyPriceChange).toLocaleString(
                    "en-US"
                  )}`
                )
              : chalk.red(
                  `+ ${Math.abs(item.itemBuyPriceChange).toLocaleString(
                    "en-US"
                  )}`
                )
            : chalk.white(0)
        })`
      );

      console.log(
        "Sell it: ",
        chalk.magenta(item.itemSellPrice),
        ` (${
          "itemSellPriceChange" in item
            ? item.itemSellPriceChange === 0
              ? chalk.white(0)
              : item.itemSellPriceChange > 0
              ? chalk.red(
                  `- ${Math.abs(item.itemSellPriceChange).toLocaleString(
                    "en-US"
                  )}`
                )
              : chalk.green(
                  `+ ${Math.abs(item.itemSellPriceChange).toLocaleString(
                    "en-US"
                  )}`
                )
            : chalk.white(0)
        })`
      );

      console.log(
        "Potential Profit: ",
        chalk.green(item.profit),
        ` (${
          "itemProfitChange" in item
            ? item.itemProfitChange === 0
              ? chalk.white(0)
              : item.itemProfitChange < 0
              ? chalk.red(
                  `- ${Math.abs(item.itemProfitChange).toLocaleString("en-US")}`
                )
              : chalk.green(
                  `+ ${Math.abs(item.itemProfitChange).toLocaleString("en-US")}`
                )
            : chalk.white(0)
        })`
      );
      console.log("Limit: ", chalk.hex("#ffeead").bold(item.limit));
      console.log(
        "Daily Volume: ",
        chalk.hex("#FFC0CB").bold(item.dailyVolume)
      );
    });
    console.log(
      chalk.red(
        "\n-------------------------------------------------------------------------------------"
      )
    );
    console.log("Items Found: " + chalk.blueBright(`${items.length}`));
    console.log(
      "Last Updated: " +
        chalk.bgBlack(chalk.red(new Date(Date.now()).toLocaleString()))
    );
    console.log(
      chalk.red(
        "-------------------------------------------------------------------------------------"
      )
    );
  }
}

async function findProfitableItems(filters) {
  try {
    const itemMap = await fetchMapping();
    const itemVolumes = await fetchVolumes();
    const items = await fetchItems();
    const filteredItemsByPrice = filterItemsByPrice(
      items,
      filters.highPrice,
      filters.lowPrice
    );

    const filteredItemsByVolume = filterItemsByVolume(
      filteredItemsByPrice,
      itemVolumes,
      filters.volume
    );

    const filteredItemsAfterLastSold = filterItemsByLastSold(
      filteredItemsByVolume,
      filters.hoursAgo
    );

    const filteredItemsByWantedProfit = filterItemByProfit(
      filteredItemsAfterLastSold,
      filters.wantedProfit
    );

    const finalProfitableItems = mapItemsWithDetails(
      filteredItemsByWantedProfit,
      itemMap,
      itemVolumes
    );

    const itemsSortedByProfit = sortByMostProfit(finalProfitableItems);

    return itemsSortedByProfit;
  } catch (err) {
    console.log(err);
    return [];
  }
}

const filters = {
  highPrice: 800000000,
  lowPrice: 20000000,
  hoursAgo: 2,
  wantedProfit: 500000,
  volume: 200,
};

let originalItemFetch;
findProfitableItems(filters).then((items) => {
  prettyPrint(items);
  originalItemFetch = items;
});

setInterval(async () => {
  const freshItems = await findProfitableItems(filters);
  const itemPricesChanged = compareItemsForChange(
    originalItemFetch,
    freshItems
  );
  if (itemPricesChanged) {
    const itemsWithPriceChanges = mapItemsWithPriceChanges(
      originalItemFetch,
      freshItems
    );
    prettyPrint(itemsWithPriceChanges);
    originalItemFetch = itemsWithPriceChanges;
  } else {
    prettyPrint(freshItems);
  }
}, 1000 * 60 * 2);

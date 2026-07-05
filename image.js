const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const BASE_URL = "https://townteam.com";
const OUTPUT_DIR = "images";

async function downloadImage(url, filepath) {
  try {
    await fs.ensureDir(path.dirname(filepath));

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (err) {
    console.log("Image error:", url);
  }
}

async function getAllProducts() {
  let page = 1;
  let allProducts = [];

  while (true) {
    const url = `${BASE_URL}/products.json?limit=250&page=${page}`;

    console.log("Fetching:", url);

    const res = await axios.get(url);
    const products = res.data.products;

    if (!products || products.length === 0) break;

    allProducts.push(...products);
    page++;
  }

  return allProducts;
}

async function start() {
  console.log("Fetching all products...\n");

  const products = await getAllProducts();

  console.log(`Total products found: ${products.length}\n`);

  for (const product of products) {
    const productName = product.title.replace(/[\\/:*?"<>|]/g, "-");

    const folder = path.join(
      OUTPUT_DIR,
      product.product_type || "other",
      productName
    );

    await fs.ensureDir(folder);

    let index = 1;

    for (const image of product.images) {
      const filepath = path.join(folder, `${index}.jpg`);

      await downloadImage(image.src, filepath);

      console.log(`Downloaded: ${productName}/${index}.jpg`);

      index++;
    }
  }

  console.log("\nAll products downloaded!");
}

start();
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CryptoPunksMarket = await ethers.getContractFactory(
    "CryptoPunksMarket"
  );
  const PunkToken = await ethers.getContractFactory("PunkToken");
  const PunkFund = await ethers.getContractFactory("PunkFund");

  const cpm = await CryptoPunksMarket.deploy();
  await cpm.deployed();

  const pt = await PunkToken.deploy();
  await pt.deployed();

  const pf = await PunkFund.deploy(cpm.address, pt.address);
  await pf.deployed();

  console.log("CryptoPunksMarket address:", cpm.address);
  console.log("PunkToken address:", pt.address);
  console.log("PunkFund address:", pf.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

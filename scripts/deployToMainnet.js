async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const cryptoPunksAddress = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";

  const PunkToken = await ethers.getContractFactory("PunkToken");
  const PunkFund = await ethers.getContractFactory("PunkFund");

  const pt = await PunkToken.deploy();
  await pt.deployed();

  const pf = await PunkFund.deploy(cryptoPunksAddress, pt.address);
  await pf.deployed();

  console.log("PunkToken address:", pt.address);
  console.log("PunkFund address:", pf.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const { expect } = require("chai");
const { both } = require("./Utils");

describe("ModifiedERC20Token Tests", function () {

    beforeEach(async function() {
        [owner, other, stranger, ...accounts] = await ethers.getSigners();

        ModifiedERC20Token = await ethers.getContractFactory("ModifiedERC20Token");
        ERC20 = await ethers.getContractFactory("ERC20PresetMinterPauser");
        
        myERC20Token = await ERC20.deploy("myERC20Token", "myERC20Token");

        modERC20 = await ModifiedERC20Token.deploy(myERC20Token.address, 10, 20, 0, 0, other.address);
        
        await myERC20Token.mint(owner.address, 1000);
    });

    it("Correct toBurn setting (valid toBurn value)", async function () {
        await modERC20.setToBurn(20);

        expect(await modERC20.toBurn()).to.equal(20);
    });

    it("Incorrect toBurn setting (invalid toBurn value)", async function () {
        await expect(modERC20.setToBurn(110)).to.be.revertedWith("Invalid toBurn");
        await expect(modERC20.setToBurn(95)).to.be.revertedWith("Invalid toBurn");
    });

    it("Correct fee setting (valid fee value)", async function () {
        await modERC20.setFee(30);

        expect(await modERC20.fee()).to.equal(30);
    });

    it("Incorrect fee setting (invalid fee value)", async function () {
        await expect(modERC20.setFee(134)).to.be.revertedWith("Invalid fee");
        await expect(modERC20.setFee(90)).to.be.revertedWith("Invalid fee");
    });

    it("Invalid account call setToBurn", async function () {
        await expect(modERC20.connect(other).setToBurn(10)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Invalid account call setFee", async function () {
        await expect(modERC20.connect(other).setFee(30)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Can't swap myERC20Token with not enough amount of myERC20Token approved", async function () {
        await myERC20Token.approve(modERC20.address, 500);
        await expect(modERC20.swapToken(700)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("Correct balance after swap myERC20Token", async function () {
        await myERC20Token.approve(modERC20.address, 900);
        await modERC20.swapToken(800);

        expect(await modERC20.balanceOf(owner.address)).to.equal(720);
        expect(await myERC20Token.balanceOf(modERC20.burnAddress())).to.equal(80);
        expect(await modERC20.tokenVaultFeesPool()).to.equal(160);
        expect(await modERC20.tokenVaultStakersPool()).to.equal(560);
    });

    it("Can't swap more myERC20Token than user has on balance", async function () {
        await myERC20Token.approve(modERC20.address, 2000);
        await expect(modERC20.swapToken(1500)).revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Correct balance after swap back", async function () {
        await myERC20Token.approve(modERC20.address, 900);
        await modERC20.swapToken(800);
        await modERC20.swapBack(300);
        
        expect(await myERC20Token.balanceOf(owner.address)).to.equal(500);
        expect(await modERC20.balanceOf(owner.address)).to.equal(420);
        expect(await modERC20.tokenVaultStakersPool()).to.equal(260);
        expect(await modERC20.tokenVaultFeesPool()).to.equal(160);
    });

    it("Can't swap back more modERC20 than user has on balance", async function () {
        await myERC20Token.approve(modERC20.address, 900);
        await modERC20.swapToken(800);
        await expect(modERC20.swapBack(850)).revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Not collector collecting myERC20Token from pools", async function () {
        await expect(modERC20.collectFromPools(100)).to.be.revertedWith("Only erm can call collectFromPools");
    });

    it("Collecting only from the tokenVaultFeesPool", async function () {
        await myERC20Token.approve(modERC20.address, 900);
        await modERC20.swapToken(800);

        const {reply} = await both(modERC20.connect(other), "collectFromPools", [100]);
        expect(reply).to.equal(100);        
        
        expect(await myERC20Token.balanceOf(other.address)).to.equal(100);
        expect(await modERC20.tokenVaultFeesPool()).to.equal(60);
        expect(await modERC20.tokenVaultStakersPool()).to.equal(560);
    });

    it("Collecting when tokenVaultFeesPool becomes zero", async function () {
        await myERC20Token.approve(modERC20.address, 900);
        await modERC20.swapToken(800);

        const {reply} = await both(modERC20.connect(other), "collectFromPools", [200]);
        expect(reply).to.equal(200);

        expect(await myERC20Token.balanceOf(other.address)).to.equal(200);
        expect(await modERC20.tokenVaultFeesPool()).to.equal(0);
        expect(await modERC20.tokenVaultStakersPool()).to.equal(520);
    });

    it("Collecting when tokenVaultFeesPool and tokenVaultStakersPool become zero", async function () {
        await myERC20Token.approve(modERC20.address, 900);
        await modERC20.swapToken(800);

        const {reply} = await both(modERC20.connect(other), "collectFromPools", [750]);
        expect(reply).to.equal(720);

        expect(await myERC20Token.balanceOf(other.address)).to.equal(720);
        expect(await modERC20.tokenVaultFeesPool()).to.equal(0);
        expect(await modERC20.tokenVaultStakersPool()).to.equal(0);
    });
});
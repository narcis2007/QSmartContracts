'use strict';

const expectThrow = require('./expectThrow.js')
const BigNumber = require('bignumber.js')
var QToken = artifacts.require("QToken");
var FeeCollector = artifacts.require("FeeCollector");
const SUPPLY = new BigNumber('1000000000').times(new BigNumber('10').pow(8));

async function deployTokenContract() {
    return await QToken.new(SUPPLY)
}

contract('QToken', async (accounts) => {

    describe('token details', function() {

        it('should return the correct total supply after construction',async () => {
            let token = await deployTokenContract();
            let totalSupply = await token.totalSupply()

            assert.equal(totalSupply.toString(), SUPPLY.toString())
        });

        it('should have the name Q', async function() {
            let token = await deployTokenContract();
            let name = await token.name()
            assert.equal(name, "Q", "Q wasn't the name")
        });

        it('should have the symbol Q', async function() {
            let token = await deployTokenContract();
            let symbol = await token.symbol()
            assert.equal(symbol, "Q", "Q wasn't the symbol")
        });

        it('should have 8 decimals', async function() {
            let token = await deployTokenContract();
            let decimals = await token.decimals()
            assert.equal(decimals, 8, "8 wasn't the number of decimals")
        });
    });

    describe('transfers', function () {

        it('should allow transfer() 100 units from accounts[0] to accounts[1]', async function() {
            let token = await deployTokenContract();

            let amount = 100

            // initial account[0] and account[1] balance
            let account0StartingBalance = await token.balanceOf(accounts[0])
            let account1StartingBalance = await token.balanceOf(accounts[1])

            // transfer amount from account[0] to account[1]
            await token.transfer(accounts[1], amount, { from: accounts[0] })

            // final account[0] and account[1] balance
            let account0EndingBalance = await token.balanceOf(accounts[0])
            let account1EndingBalance = await token.balanceOf(accounts[1])

            assert.equal(account0EndingBalance.toString(), (account0StartingBalance -amount).toString(), "Balance of account 0 incorrect")
            assert.equal(account1EndingBalance.toString(), amount.toString(), "Balance of account 1 incorrect")
        });

        it('should throw an error when trying to transfer more than a balance', async function () {
            let token = await deployTokenContract();

            let accountStartingBalance = await token.balanceOf(accounts[0]);
            let amount = accountStartingBalance + 1;
            await expectThrow(  token.transfer(accounts[2], amount, { from: accounts[0] }));
        });

        it('should transfer the right fees to the FeeCollector contract - capped', async function() {
            let token = await deployTokenContract();
            let feeCollector = await FeeCollector.new(token.address);
            await token.setFeeCollectorAddress(feeCollector.address);

            // transfer SUPPLY from account[0] to account[1]
            await token.transfer(accounts[1], SUPPLY, { from: accounts[0] })

            assert.equal(await token.balanceOf(accounts[1]), (SUPPLY - 100 * Math.pow(10,8)).toString(), "Balance of account 1 incorrect");
            assert.equal(await token.balanceOf(accounts[0]), 0, "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(feeCollector.address), 100 * Math.pow(10,8), "Balance of fee collector incorrect");


        });

        it('should let only the payment processor to perform special transfers', async function() {
            let token = await deployTokenContract();
            let hash = "0x6466626466646668646668646668646668646666666666666666666868686866";
            await expectThrow( token.paymentProcessorTransferFrom(accounts[1], accounts[2], SUPPLY, hash, { from: accounts[0] }));

            await token.transfer(accounts[1], SUPPLY, { from: accounts[0] })

            await token.approvePaymentProcessorAddress(accounts[0]);

            await token.paymentProcessorTransferFrom(accounts[1], accounts[2], SUPPLY, hash, { from: accounts[0] });

            assert.equal(await token.balanceOf(accounts[2]), SUPPLY.toString(), "Balance of account 2 incorrect");
            assert.equal(await token.balanceOf(accounts[0]), 0, "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(accounts[1]), 0, "Balance of account 1 incorrect");


        });

    });

    describe('token distribution', function () {

        it('should give the owner the initial supply after deploy', async function () {
            let token = await deployTokenContract();
            assert.equal((await token.totalSupply()).toString(), SUPPLY.toString())
            assert.equal((await token.balanceOf(accounts[0])).toString(), SUPPLY.toString())
        });

        it('should be able to mint new tokens after deploy', async function () {
            let token = await deployTokenContract();
            assert.equal((await token.totalSupply()).toString(), SUPPLY.toString())
            assert.equal((await token.balanceOf(accounts[0])).toString(), SUPPLY.toString())

            await token.mint(accounts[0], 1234, {from : accounts[0]});

            assert.equal((await token.totalSupply()).toString(), SUPPLY.plus(1234).toString())
            assert.equal((await token.balanceOf(accounts[0])).toString(), SUPPLY.plus(1234));

        });

        it('should not be able to mint new tokens after the minter role is renounced', async function () {
            let token = await deployTokenContract();
            assert.equal((await token.totalSupply()).toString(), SUPPLY.toString())
            assert.equal((await token.balanceOf(accounts[0])).toString(), SUPPLY.toString())

            await token.renounceMinter({from : accounts[0]});
            await expectThrow(token.mint(accounts[0], 1234, {from : accounts[0]}));
        });
    });

    describe('allowance', function () {

        it('should return the correct allowance amount after approval', async function () {
            let token = await deployTokenContract();

            let amount = 100;

            //owner(account[0]) approves to account[1] to spend the amount
            await token.approve(accounts[1], amount);

            //checking the amount that an owner allowed to
            let allowance = await token.allowance(accounts[0], accounts[1]);
            assert.equal(allowance, amount, "The amount allowed is not equal!")

            //checking the amount to a not allowed account
            let non_allowance = await token.allowance(accounts[0], accounts[2]);
            assert.equal(non_allowance, 0, "The amount allowed is not equal!")
        });

        it('should allow transfer from allowed account', async function () {
            let token = await deployTokenContract();

            let amount = 100;

            let account0StartingBalance = await token.balanceOf(accounts[0]);
            let account1StartingBalance = await token.balanceOf(accounts[1]);
            let account2StartingBalance = await token.balanceOf(accounts[2]);
            assert.equal(account1StartingBalance, 0);
            assert.equal(account2StartingBalance, 0);

            //owner(account[0]) approves to account[1] to spend the amount
            await token.approve(accounts[1], amount);

            //account[1] orders a transfer from owner(account[0]) to account[1]
            await token.transferFrom(accounts[0], accounts[2], amount, {from : accounts[1]});
            let account0AfterTransferBalance = await token.balanceOf(accounts[0]);
            let account1AfterTransferBalance = await token.balanceOf(accounts[1]);
            let account2AfterTransferBalance = await token.balanceOf(accounts[2]);

            assert.equal(account0StartingBalance - amount, account0AfterTransferBalance);
            assert.equal(account1AfterTransferBalance, 0);
            assert.equal(amount, account2AfterTransferBalance)
        });

        it('should throw an error when trying to transfer more than allowed', async function() {
            let token = await deployTokenContract();
            let amount = 100;

            //owner(account[0]) approves to account[1] to spend the amount
            await token.approve(accounts[1], amount);

            let overflowed_amount = amount + 1;
            await expectThrow(  token.transferFrom(accounts[0], accounts[2], overflowed_amount, {from: accounts[1]}));
        })

        it('should throw an error when trying to transfer from not allowed account', async function() {
            let token = await deployTokenContract();
            let amount = 100;
            await expectThrow( token.transferFrom(accounts[0], accounts[2], amount, {from: accounts[1]}))
        })
    });

    describe('burnable', function () {

        it('owner should be able to burn tokens', async function () {
            let token = await deployTokenContract();
            let balance              = await token.balanceOf(accounts[0]);
            let totalSupply          = await token.totalSupply();
            let luckys_burned_amount = 100;
            let expectedTotalSupply  = totalSupply - luckys_burned_amount;
            let expectedBalance      = balance - luckys_burned_amount

            const {logs} = await token.burn(luckys_burned_amount);
            let final_supply = await token.totalSupply();
            let final_balance = await token.balanceOf(accounts[0]);
            assert.equal(expectedTotalSupply, final_supply, "Supply after burn does not fit.");
            assert.equal(expectedBalance, final_balance, "Balance for account 0 after burn does not fit.");

            const event = logs.find(e => e.event === 'Transfer');
            assert.notEqual(event, undefined, "Event not fired!")
        });

        it('Can not burn more tokens than your balance', async function () {
            let token = await deployTokenContract();
            let totalSupply = await token.totalSupply();
            let luckys_burnable_amount = totalSupply + 1;
            await expectThrow(  token.burn(luckys_burnable_amount));
        });
    });

});
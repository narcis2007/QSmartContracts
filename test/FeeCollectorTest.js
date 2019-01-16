'use strict';

const expectThrow = require('./expectThrow.js')
const BigNumber = require('bignumber.js')
var QToken = artifacts.require("QToken");
var FeeCollector = artifacts.require("FeeCollector");
const SUPPLY = new BigNumber('1000000000').times(new BigNumber('10').pow(8));

contract('FeeCollector', async (accounts) => {

    describe('notice', function() {

        it('should give the right amount of fees collected', async () => {
            let token = await QToken.new(SUPPLY)
            let feeCollector = await FeeCollector.new(token.address);
            await token.setFeeCollectorAddress(feeCollector.address);

            await token.transfer(accounts[1], 1000, {from: accounts[0]})

            assert.equal(await feeCollector.tokensToBeDistributed.call(), 1, "Incorrect number of fees collected!");

            await token.transfer(accounts[1], 1000, {from: accounts[0]})

            assert.equal(await feeCollector.tokensToBeDistributed.call(), 2, "Incorrect number of fees collected!");
        });

        it('should only allow the given token address to call it', async () => {
            let token = await QToken.new(SUPPLY)
            let feeCollector = await FeeCollector.new(token.address);
            await token.setFeeCollectorAddress(feeCollector.address);

            let token2 = await QToken.new(SUPPLY)
            await token2.setFeeCollectorAddress(feeCollector.address);

            await expectThrow( token2.transfer(accounts[1], 1000, {from: accounts[0]}))
        });
    });

    describe('rounds', function() {

        it('full flow', async () => {
            let token = await QToken.new(SUPPLY)
            let feeCollector = await FeeCollector.new(token.address);
            await token.setFeeCollectorAddress(feeCollector.address);

            await token.transfer(accounts[1], 1000, {from: accounts[0]})

            assert.equal(await feeCollector.tokensToBeDistributed.call(), 1, "Incorrect number of fees collected!");

            await token.transfer(accounts[1], 1000, {from: accounts[0]})

            assert.equal(await feeCollector.tokensToBeDistributed.call(), 2, "Incorrect number of fees collected!");
        });
    });

});
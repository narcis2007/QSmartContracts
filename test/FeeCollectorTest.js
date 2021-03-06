'use strict';

const expectThrow = require('./expectThrow.js');
const timeTravel = require('./TimeTravel');
const BigNumber = require('bignumber.js');
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

            await feeCollector.setMakerDaoAddress(accounts[2]);

            await token.transfer(accounts[1], SUPPLY.div(2), {from: accounts[0]});
            await token.approve(feeCollector.address, SUPPLY, {from: accounts[0]});
            await token.approve(feeCollector.address, SUPPLY, {from: accounts[1]});

            assert.equal(await feeCollector.tokensToBeDistributed.call(), new BigNumber('100').times(new BigNumber('10').pow(8)).toNumber(), "Incorrect number of fees collected!");

            await feeCollector.startRound(100000000);

            assert.equal((await feeCollector.tokensToBeDistributed.call()).toString(), '0', "Incorrect number of tokens to be distributed!");
            assert.equal(await feeCollector.isThereARoundActive.call(), true, "A distribution round should be active!");

            await feeCollector.lockTokensForActiveRound(100000000, {from: accounts[1]});

            await timeTravel(3600);

            await feeCollector.stopActiveRound();
            await feeCollector.retrieveTokensAfterRoundFinished(0);
            await feeCollector.retrieveTokensAfterRoundFinished( 0, {from: accounts[1]});

            assert.equal((await token.balanceOf(accounts[0])).toString(), SUPPLY.div(2).plus(new BigNumber('25').times(new BigNumber('10').pow(8))).toString())
            assert.equal((await token.balanceOf(accounts[1])).toString(), SUPPLY.div(2).minus(new BigNumber('75').times(new BigNumber('10').pow(8))).toString())

            assert.equal((await token.balanceOf(accounts[2])).toString(), new BigNumber('50').times(new BigNumber('10').pow(8)).toString());
            assert.equal(1, await feeCollector.getNumberOfRounds());

        });

        it('full flow with exceptions', async () => {
            let token = await QToken.new(SUPPLY)
            let feeCollector = await FeeCollector.new(token.address);
            await token.setFeeCollectorAddress(feeCollector.address);



        });
    });

});
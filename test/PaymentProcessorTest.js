'use strict';

const expectThrow = require('./expectThrow.js')
const BigNumber = require('bignumber.js')
var QToken = artifacts.require("QToken");
var PaymentProcessor = artifacts.require("PaymentProcessor");
var DiscountManager = artifacts.require("DiscountManager");

var EthUtil = require('ethereumjs-util');
const Web3 = require("web3")


const myWeb3 = new Web3(web3.currentProvider) //Use the latest web3 version not the old one which is injected by default


const SUPPLY = new BigNumber('1000000000').times(new BigNumber('10').pow(8));

async function deployTokenContract() {
    return await QToken.new(SUPPLY)
}

contract('PaymentProcessor', async (accounts) => {

    describe('payments', function () {

        it('should allow people to buy from merchants with no ETH and only tokens', async function() {
            let token = await deployTokenContract();
            let discountManager = await DiscountManager.new(token.address)
            let paymentProcessor = await PaymentProcessor.new(token.address, discountManager.address);
            await token.approvePaymentProcessorAddress(paymentProcessor.address);

            const buyerAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';
            const buyerPrivateKey = '43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46';

            await token.transfer(buyerAddress, SUPPLY.div(2), { from: accounts[0] });

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.div(2).toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), SUPPLY.div(2).toString(), "Balance of buyer incorrect");
            // assert.equal(await myWeb3.eth.getBalance(accounts[0]),"0", "buyer should have no ETH");
            let timestamp = new Date().getTime();
            const messageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({t: 'address', v: accounts[0]},{t: 'string', v: "something"},{t: 'uint256', v: SUPPLY.div(2).toString()},{t: 'uint256', v: timestamp.toString()}  ));

            var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign));
            var signature = EthUtil.ecsign(msgHash, new Buffer(buyerPrivateKey, 'hex'));
            console.log('v: ' + signature.v.toString())
            console.log('r: 0x' + signature.r.toString('hex'))
            console.log('s: 0x' + signature.s.toString('hex'))
            await paymentProcessor.processPayment("something", SUPPLY.div(2).toString(), timestamp,signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 10, '0x0000000000000000000000000000000000000000')

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), "0", "Balance of buyer incorrect");

            await expectThrow( paymentProcessor.processPayment("something", SUPPLY.div(2).toString(), timestamp, signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 10, '0x0000000000000000000000000000000000000000'))

            //TODO: make another purchase and check for discount

            await token.transfer(buyerAddress, SUPPLY.div(2), { from: accounts[0] });

            timestamp = new Date().getTime();
            const messageToSign2 = EthUtil.toBuffer(myWeb3.utils.soliditySha3({t: 'address', v: accounts[0]},{t: 'string', v: "something else"},{t: 'uint256', v: SUPPLY.div(2).toString()},{t: 'uint256', v: timestamp.toString()}  ));

            var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign2));
            var signature = EthUtil.ecsign(msgHash, new Buffer(buyerPrivateKey, 'hex'));
            console.log('v: ' + signature.v.toString())
            console.log('r: 0x' + signature.r.toString('hex'))
            console.log('s: 0x' + signature.s.toString('hex'))
            await paymentProcessor.processPayment("something else", SUPPLY.div(2).toString(), timestamp,signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 0, '0x0000000000000000000000000000000000000000')

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.minus(SUPPLY.div(2).div(10)).toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), SUPPLY.div(2).div(10).toString(), "Balance of buyer incorrect");



        });

        it('should give a referral discount the first time for both the buyer and advertiser', async function() {
            let token = await deployTokenContract();
            let discountManager = await DiscountManager.new(token.address)
            let paymentProcessor = await PaymentProcessor.new(token.address, discountManager.address);
            await token.approvePaymentProcessorAddress(paymentProcessor.address);

            const buyerAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';
            const buyerPrivateKey = '43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46';

            await token.transfer(buyerAddress, SUPPLY.div(2), { from: accounts[0] });

            let timestamp = new Date().getTime();
            const messageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({t: 'address', v: accounts[0]},{t: 'string', v: "something"},{t: 'uint256', v: SUPPLY.div(2).toString()},{t: 'uint256', v: timestamp.toString()}  ));

            var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign));
            var signature = EthUtil.ecsign(msgHash, new Buffer(buyerPrivateKey, 'hex'));
            console.log('v: ' + signature.v.toString())
            console.log('r: 0x' + signature.r.toString('hex'))
            console.log('s: 0x' + signature.s.toString('hex'))
            console.log(accounts[9]);
            await paymentProcessor.processPayment("something", SUPPLY.div(2).toString(), timestamp,signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 0, accounts[9])

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.minus(SUPPLY.div(2).div(20)).toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), SUPPLY.div(2).div(20).toString(), "Balance of buyer incorrect");

            assert.equal(await discountManager.getAdvertiserReferralDiscountInTokens(accounts[9], 100),10)

        });

    });

});
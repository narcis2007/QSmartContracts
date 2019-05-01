'use strict';

const timeTravel = require('./TimeTravel');
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

    describe('processPayment', function () {

        it('should allow people to buy from merchants with no ETH and only tokens', async function () {
            let token = await deployTokenContract();
            let discountManager = await DiscountManager.new()
            let paymentProcessor = await PaymentProcessor.new(token.address, discountManager.address);
            await token.approvePaymentProcessorAddress(paymentProcessor.address);

            await discountManager.approvePaymentProcessorAddress(paymentProcessor.address);

            const buyerAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';
            const buyerPrivateKey = '43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46';

            await token.transfer(buyerAddress, SUPPLY.div(2), {from: accounts[0]});

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.div(2).toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), SUPPLY.div(2).toString(), "Balance of buyer incorrect");
            // assert.equal(await myWeb3.eth.getBalance(accounts[0]),"0", "buyer should have no ETH");
            let timestamp = new Date().getTime();
            const messageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'address',
                v: accounts[0]
            }, {t: 'uint256', v: SUPPLY.div(2).toString()}, {t: 'uint256', v: timestamp.toString()}, {
                t: 'address',
                v: '0x0000000000000000000000000000000000000000'
            }));

            var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign));
            var signature = EthUtil.ecsign(msgHash, new Buffer(buyerPrivateKey, 'hex'));
            console.log('v: ' + signature.v.toString())
            console.log('r: 0x' + signature.r.toString('hex'))
            console.log('s: 0x' + signature.s.toString('hex'))
            await paymentProcessor.processPayment(SUPPLY.div(2).toString(), timestamp, signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 10, '0x0000000000000000000000000000000000000000')

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), "0", "Balance of buyer incorrect");

            await expectThrow(paymentProcessor.processPayment(SUPPLY.div(2).toString(), timestamp, signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 10, '0x0000000000000000000000000000000000000000'))

            //TODO: make another purchase and check for discount

            await token.transfer(buyerAddress, SUPPLY.div(2), {from: accounts[0]});

            timestamp = new Date().getTime();
            const messageToSign2 = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'address',
                v: accounts[0]
            }, {t: 'uint256', v: SUPPLY.div(2).toString()}, {t: 'uint256', v: timestamp.toString()}, {
                t: 'address',
                v: '0x0000000000000000000000000000000000000000'
            }));

            var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign2));
            var signature = EthUtil.ecsign(msgHash, new Buffer(buyerPrivateKey, 'hex'));
            console.log('v: ' + signature.v.toString())
            console.log('r: 0x' + signature.r.toString('hex'))
            console.log('s: 0x' + signature.s.toString('hex'))
            await paymentProcessor.processPayment(SUPPLY.div(2).toString(), timestamp, signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 0, '0x0000000000000000000000000000000000000000')

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.minus(SUPPLY.div(2).div(10)).toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), SUPPLY.div(2).div(10).toString(), "Balance of buyer incorrect");


        });

        it('should give a referral discount the first time for both the buyer and advertiser', async function () {
            let token = await deployTokenContract();
            let discountManager = await DiscountManager.new()
            let paymentProcessor = await PaymentProcessor.new(token.address, discountManager.address);
            await token.approvePaymentProcessorAddress(paymentProcessor.address);

            await discountManager.approvePaymentProcessorAddress(paymentProcessor.address);

            const buyerAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';
            const buyerPrivateKey = '43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46';

            await token.transfer(buyerAddress, SUPPLY.div(2), {from: accounts[0]});

            let timestamp = new Date().getTime();
            const messageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'address',
                v: accounts[0]
            }, {t: 'uint256', v: SUPPLY.div(2).toString()}, {t: 'uint256', v: timestamp.toString()}, {
                t: 'address',
                v: accounts[9]
            }));

            var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign));
            var signature = EthUtil.ecsign(msgHash, new Buffer(buyerPrivateKey, 'hex'));
            console.log('v: ' + signature.v.toString())
            console.log('r: 0x' + signature.r.toString('hex'))
            console.log('s: 0x' + signature.s.toString('hex'))
            console.log(accounts[9]);
            await paymentProcessor.processPayment(SUPPLY.div(2).toString(), timestamp, signature.v.toString(), '0x' + signature.r.toString('hex'), '0x' + signature.s.toString('hex'), 0, accounts[9])

            assert.equal(await token.balanceOf(accounts[0]), SUPPLY.minus(SUPPLY.div(2).div(20)).toString(), "Balance of account 0 incorrect");
            assert.equal(await token.balanceOf(buyerAddress), SUPPLY.div(2).div(20).toString(), "Balance of buyer incorrect");

            assert.equal(await discountManager.getAdvertiserReferralDiscountInTokens(accounts[9], 100), 10)

        });
    });
    describe('processPaymentThirdPartyPaysForGas', function () {

        it('should let a third party mediate transfers between merchants and buyers with no ETH', async function () {
            let token = await deployTokenContract();
            let discountManager = await DiscountManager.new()
            let paymentProcessor = await PaymentProcessor.new(token.address, discountManager.address);
            await token.approvePaymentProcessorAddress(paymentProcessor.address);

            await discountManager.approvePaymentProcessorAddress(paymentProcessor.address);

            const buyerAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';
            const buyerPrivateKey = '43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46';

            const merchantAddress = '0x072620c80A727f51B3547716a81cf806D773Db2f';
            const merchantPrivateKey = '10c135c542170eb2381878977d1070c8b1eab7da0d4890090d5df98c9456e657';

            await token.transfer(buyerAddress, SUPPLY.div(10), {from: accounts[0]});
            await token.transfer(merchantAddress, SUPPLY.div(10), {from: accounts[0]});

            let orderTimestamp = new Date().getTime();

            const buyerMessageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'address',
                v: merchantAddress
            }, {t: 'uint256', v: SUPPLY.div(10).toString()}, {t: 'uint256', v: orderTimestamp.toString()}, {
                t: 'address',
                v: '0x0000000000000000000000000000000000000000'
            }));

            var msgHashBuyer = EthUtil.hashPersonalMessage(new Buffer(buyerMessageToSign));
            var signatureBuyer = EthUtil.ecsign(msgHashBuyer, new Buffer(buyerPrivateKey, 'hex'));
            // console.log('v: ' + signatureBuyer.v.toString())
            // console.log('r: 0x' + signatureBuyer.r.toString('hex'))
            // console.log('s: 0x' + signatureBuyer.s.toString('hex'))

            const merchantMessageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'uint256',
                v: SUPPLY.div(10).toString()
            }, {t: 'uint256', v: orderTimestamp.toString()}, {
                t: 'uint256',
                v: '0'
            }, {t: 'uint256', v: '0'}));

            var msgHashMerchant = EthUtil.hashPersonalMessage(new Buffer(merchantMessageToSign));
            var signatureMerchant = EthUtil.ecsign(msgHashMerchant, new Buffer(merchantPrivateKey, 'hex'));
            // console.log('v: ' + signatureBuyer.v.toString())
            // console.log('r: 0x' + signatureBuyer.r.toString('hex'))
            // console.log('s: 0x' + signatureBuyer.s.toString('hex'))

            await paymentProcessor.processPaymentThirdPartyPaysForGas(merchantAddress, SUPPLY.div(10).toString(), orderTimestamp, 0, [signatureBuyer.v.toString(), signatureMerchant.v.toString()], ['0x' + signatureBuyer.r.toString('hex'), '0x' + signatureBuyer.s.toString('hex'), '0x' + signatureMerchant.r.toString('hex'), '0x' + signatureMerchant.s.toString('hex')], 0, '0x0000000000000000000000000000000000000000', buyerAddress,
                {from: accounts[1]})

            assert.equal(await token.balanceOf(accounts[1]), '10000000', "Balance of third party incorrect");
            assert.equal(await token.balanceOf(buyerAddress), '0', "Balance of buyer incorrect");
            assert.equal(await token.balanceOf(merchantAddress), SUPPLY.div(5).minus(10000000).toString(), "Balance of merchant incorrect");
        });

        it('the loyalty discount should be able to expire', async function () {
            let token = await deployTokenContract();
            let discountManager = await DiscountManager.new()
            let paymentProcessor = await PaymentProcessor.new(token.address, discountManager.address);
            await token.approvePaymentProcessorAddress(paymentProcessor.address);

            await discountManager.approvePaymentProcessorAddress(paymentProcessor.address);

            const buyerAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';
            const buyerPrivateKey = '43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46';

            const merchantAddress = '0x072620c80A727f51B3547716a81cf806D773Db2f';
            const merchantPrivateKey = '10c135c542170eb2381878977d1070c8b1eab7da0d4890090d5df98c9456e657';

            await token.transfer(buyerAddress, SUPPLY.div(10), {from: accounts[0]});

            let orderTimestamp = new Date().getTime();
            let loyaltyDiscountExpirationTimestampInSeconds = ~~(new Date().getTime()/1000) + 1000;

            var buyerMessageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'address',
                v: merchantAddress
            }, {t: 'uint256', v: SUPPLY.div(10).toString()}, {t: 'uint256', v: orderTimestamp.toString()}, {
                t: 'address',
                v: '0x0000000000000000000000000000000000000000'
            }));

            var msgHashBuyer = EthUtil.hashPersonalMessage(new Buffer(buyerMessageToSign));
            var signatureBuyer = EthUtil.ecsign(msgHashBuyer, new Buffer(buyerPrivateKey, 'hex'));
            // console.log('v: ' + signatureBuyer.v.toString())
            // console.log('r: 0x' + signatureBuyer.r.toString('hex'))
            // console.log('s: 0x' + signatureBuyer.s.toString('hex'))

            var merchantMessageToSign = EthUtil.toBuffer(myWeb3.utils.soliditySha3({
                t: 'uint256',
                v: SUPPLY.div(10).toString()
            }, {t: 'uint256', v: orderTimestamp.toString()}, {
                t: 'uint256',
                v: '10'
            }, {t: 'uint256', v: loyaltyDiscountExpirationTimestampInSeconds.toString()}));

            var msgHashMerchant = EthUtil.hashPersonalMessage(new Buffer(merchantMessageToSign));
            var signatureMerchant = EthUtil.ecsign(msgHashMerchant, new Buffer(merchantPrivateKey, 'hex'));
            // console.log('v: ' + signatureBuyer.v.toString())
            // console.log('r: 0x' + signatureBuyer.r.toString('hex'))
            // console.log('s: 0x' + signatureBuyer.s.toString('hex'))

            await paymentProcessor.processPaymentThirdPartyPaysForGas(merchantAddress, SUPPLY.div(10).toString(), orderTimestamp, loyaltyDiscountExpirationTimestampInSeconds, [signatureBuyer.v.toString(), signatureMerchant.v.toString()], ['0x' + signatureBuyer.r.toString('hex'), '0x' + signatureBuyer.s.toString('hex'), '0x' + signatureMerchant.r.toString('hex'), '0x' + signatureMerchant.s.toString('hex')], 10, '0x0000000000000000000000000000000000000000', buyerAddress,
                {from: accounts[1]})

            assert.equal(await token.balanceOf(accounts[1]), '10000000', "Balance of third party incorrect");
            assert.equal(await token.balanceOf(buyerAddress), '0', "Balance of buyer incorrect");
            assert.equal(await token.balanceOf(merchantAddress), SUPPLY.div(10).minus(10000000).toString(), "Balance of merchant incorrect");

            assert.equal((await discountManager.getLoyaltyDiscountInTokens(buyerAddress, merchantAddress, 100)).toString(), '10');
            await timeTravel(36000);
            assert.equal((await discountManager.getLoyaltyDiscountInTokens(buyerAddress, merchantAddress, 100)).toString(), '0');

        });


    });

});
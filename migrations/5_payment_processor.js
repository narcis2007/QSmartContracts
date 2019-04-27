const BigNumber = require('bignumber.js')

const QToken = artifacts.require("QToken");
const PaymentProcessor = artifacts.require("PaymentProcessor");
const DiscountManager = artifacts.require("DiscountManager");
const FeeCollector = artifacts.require("FeeCollector");

module.exports = async function (deployer) {

    DiscountManager.deployed().then(discountManager => {
        console.log('discountManagerAddress: ' + discountManager.address);
        deployer.deploy(PaymentProcessor, token.address, discountManager.address);
        // PaymentProcessor.deployed().then(paymentProcessor => {
        //     console.log('paymentProcessorAddress: ' + paymentProcessor.address);
        //     token.approvePaymentProcessorAddress(paymentProcessor.address).then(res => {
        //         console.log(res);
        //     });
        // });
        // });
    });
};
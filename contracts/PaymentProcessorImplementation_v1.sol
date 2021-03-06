pragma solidity ^0.5.0;

import "./QToken.sol";
import "./DiscountManager.sol";

contract PaymentProcessor_v1{

    QToken token;
    DiscountManager discountManager;
    uint thirdPartyFeeInTokens; // = 1 * (10 ** 7);// 0.1 QS/USD

    event Purchase(address buyer, address seller, address advertiser);//maybe add other fields too

    function initialize(address tokenAddress, address discountManagerAddress) public {
         token = QToken(tokenAddress);
         discountManager = DiscountManager(discountManagerAddress);
         thirdPartyFeeInTokens = 1 * (10 ** 7);
    }

    /**
    * the merchant submits the customer proof through this function to pull the tokens in his address
    * msg.sender is the merchant address
    * TODO: see if it's worth adding the referring address in the signature
    **/
    function processPayment(uint256 price, uint256 timestamp, uint8 v, bytes32 r, bytes32 s, uint nextLoyaltyDiscountPercentage, address referringAddress) public {
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(msg.sender, price, timestamp, referringAddress))));

        // Get the buyerAddress which signed the message
        address buyerAddress = ecrecover(hash, v, r, s);
        require(buyerAddress != address(0x0), 'buyerAddress is not valid!');
        require(buyerAddress != referringAddress);

        //TODO: move all discounts in that smart contract and here do only a get global discount
        price = price - discountManager.getLoyaltyDiscountInTokens(buyerAddress, msg.sender, price);
        price = price - discountManager.getAdvertiserReferralDiscountInTokens(buyerAddress, price);
        discountManager.consumeAdvertiserReferralDiscount(buyerAddress);

        if (referringAddress != address(0x0)) {
            price = price - discountManager.getBuyerReferralDiscountInTokens(buyerAddress, price);
            discountManager.consumeBuyerReferralDiscount(buyerAddress);
        }

        token.paymentProcessorTransferFrom(buyerAddress, msg.sender, price, hash);
        //check for a 0 discount maybe it saves more gas overall?
        discountManager.setNextLoyaltyDiscountPercentage(buyerAddress, msg.sender, nextLoyaltyDiscountPercentage, 0);
        discountManager.acknowledgeReferralPurchase(referringAddress);

        emit Purchase(buyerAddress, msg.sender, referringAddress);
    }

    /**
    * a third party submits both the customer and merchant signature and pays for the gas, in exchange the merchant rewards him with a few tokens to cover the ETH fee
    * v[0] - customer; v[1] - merchant
    * rs[0] - rCustomer; rs[1] - sCustomer; rs[2] - rMerchant; rs[3] - sMerchant
    **/
    //TODO: arrange these parameters so that they make more sense
    function processPaymentThirdPartyPaysForGas(address merchantAddress, uint256 price, uint256 orderTimestampInMS, uint256 loyaltyDiscountExpirationTimestamp, uint8[] memory v, bytes32[] memory rs, uint nextLoyaltyDiscountPercentage, address referringAddress, address buyerAddress) public {

        bytes32 buyerHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(merchantAddress, price, orderTimestampInMS, referringAddress))));

        // Get the buyerAddress which signed the message
        address buyerAddressFromSignature = ecrecover(buyerHash, v[0], rs[0], rs[1]);

        require(buyerAddressFromSignature != address(0x0), 'buyerAddress is not valid!');
        require(buyerAddressFromSignature != referringAddress, "buyer address must be different than the referring one");
        require(buyerAddressFromSignature == buyerAddress);

        bytes32 merchantHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(price, orderTimestampInMS, nextLoyaltyDiscountPercentage, loyaltyDiscountExpirationTimestamp))));
        require(ecrecover(merchantHash, v[1], rs[2], rs[3]) == merchantAddress, "wrong merchant address");

        //TODO: move all discounts in that smart contract and here do only a get global discount
        price = price - discountManager.getLoyaltyDiscountInTokens(buyerAddress, merchantAddress, price);
        //TODO: add the discounts then substract from the total price?
        price = price - discountManager.getAdvertiserReferralDiscountInTokens(buyerAddress, price);
        discountManager.consumeAdvertiserReferralDiscount(buyerAddress);

        if (referringAddress != address(0x0)) {
            price = price - discountManager.getBuyerReferralDiscountInTokens(buyerAddress, price);
            discountManager.consumeBuyerReferralDiscount(buyerAddress);
        }

        token.paymentProcessorTransferFrom(buyerAddress, merchantAddress, price, buyerHash);
        //check for a 0 discount maybe it saves more gas overall?
        discountManager.setNextLoyaltyDiscountPercentage(buyerAddress, merchantAddress, nextLoyaltyDiscountPercentage, loyaltyDiscountExpirationTimestamp);
        discountManager.acknowledgeReferralPurchase(referringAddress);
        token.paymentProcessorTransferFrom(merchantAddress, msg.sender, thirdPartyFeeInTokens, merchantHash);

        emit Purchase(buyerAddress, merchantAddress, referringAddress);

    }

    function getThirdPartyFeeInTokens() public view returns (uint){
        return thirdPartyFeeInTokens;
    }

    function getVersion() public pure returns (uint){
        return 1;
    }

}

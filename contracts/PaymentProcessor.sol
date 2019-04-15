pragma solidity ^0.5.0;

import "./QToken.sol";
import "./DiscountManager.sol";

contract PaymentProcessor {

    QToken token;
    DiscountManager discountManager;

    event Purchase(address buyer, address seller, address advertiser);//maybe add other fields too

    constructor(address tokenAddress, address discountManagerAddress) public {
        token = QToken(tokenAddress);
        discountManager = DiscountManager(discountManagerAddress);
    }

    /**
    * the merchant submits the customer proof through this function to pull the tokens in his address
    * msg.sender is the merchant address
    **/
    function processPayment(string memory product, uint256 price, uint256 timestamp, uint8 v, bytes32 r, bytes32 s, uint nextLoyaltyDiscountPercentage, address referringAddress) public {
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(msg.sender, product, price, timestamp))));

        // Get the buyerAddress which signed the message
        address buyerAddress = ecrecover(hash, v, r, s);
        require(buyerAddress != address(0x0), 'buyerAddress is not valid!');
        require(buyerAddress != referringAddress);

        //TODO: move all discounts in that smart contract and here do only a get global discount
        price = price - discountManager.getLoyaltyDiscountInTokens(buyerAddress, msg.sender, price);
        price = price - discountManager.getReferralDiscountInTokens(buyerAddress, price);

        discountManager.consumeReferralDiscount(buyerAddress);


        token.paymentProcessorTransferFrom(buyerAddress, msg.sender, price, hash);
        //check for a 0 discount maybe it saves more gas overall?
        discountManager.setNextLoyaltyDiscountPercentage(buyerAddress, msg.sender, nextLoyaltyDiscountPercentage);
        discountManager.acknowledgeReferralPurchase(referringAddress);

        emit Purchase(buyerAddress, msg.sender, referringAddress);
    }

    //TODO: add function to accept merchant signature too and perceive a fee for the one who sent the transaction to be processed


}

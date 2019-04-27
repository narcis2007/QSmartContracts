pragma solidity ^0.5.0;

import "./QToken.sol";
import "./math/SafeMath.sol";

contract FeeCollector {
    using SafeMath for uint;
    QToken public qToken;

    struct DistributionRound {
        uint startTime;
        uint endTime;
        uint totalLockedTokens;
        uint tokensToBeDistributed;
        bool exists;
    }

    DistributionRound[] public distributionRounds;
    mapping(uint => mapping(address => uint)) public lockedTokensForRound;
    bool public isThereARoundActive = false;
    uint public tokensToBeDistributed = 0;

    address makerDaoAddress = address(0x0);

    constructor(address qTokenAddress) public {
        qToken = QToken(qTokenAddress);
    }

    function notice(uint fee) public {
        require(msg.sender == address(qToken));
        tokensToBeDistributed += fee;
    }

    function startRound(uint tokensLocked) public {
        require(isThereARoundActive == false, "There can only be a round active at a time");
        require(tokensToBeDistributed >= 10 * (10 ** 8), "There must be enough tokens to be distributed in a round!");
        uint tokensToBedistributedForEachParty = tokensToBeDistributed / 2;
        if(makerDaoAddress != address(0x0)){
            qToken.transferWithoutFees(makerDaoAddress, tokensToBedistributedForEachParty);
        }

        DistributionRound memory distributionRound = DistributionRound(now, now + 7 minutes, 0, tokensToBedistributedForEachParty, true);
        tokensToBeDistributed = 0;
        distributionRounds.push(distributionRound);
        isThereARoundActive = true;
        lockTokensForActiveRound(tokensLocked);
    }

    function stopActiveRound() public {
        DistributionRound storage distributionRound = distributionRounds[distributionRounds.length - 1];
        require(isThereARoundActive);
        require(distributionRound.exists);
        require(distributionRound.endTime < now);

        isThereARoundActive = false;
    }

    function lockTokensForActiveRound(uint tokensLocked) public {
        uint roundIndex = distributionRounds.length - 1;
        DistributionRound storage distributionRound = distributionRounds[roundIndex];
        require(isThereARoundActive);
        require(distributionRound.exists);
        require(distributionRound.endTime >= now);

        qToken.transferFromWithoutFees(msg.sender, address(this), tokensLocked);
        distributionRound.totalLockedTokens += tokensLocked;
        lockedTokensForRound[roundIndex][msg.sender] += tokensLocked;
    }

    function retrieveTokensAfterRoundFinished(uint roundIndex) public {
        DistributionRound storage distributionRound = distributionRounds[roundIndex];

        require(distributionRound.endTime < now, "Round must not be still active!");
        require(distributionRound.exists);

        uint senderLockedTokens = lockedTokensForRound[roundIndex][msg.sender];
        uint totalTokensToBeRetrieved = (distributionRound.tokensToBeDistributed * senderLockedTokens) / distributionRound.totalLockedTokens;

        lockedTokensForRound[roundIndex][msg.sender] = 0;

        qToken.transferWithoutFees(msg.sender, totalTokensToBeRetrieved + senderLockedTokens);
    }

    function getNumberOfRounds() public view returns (uint){
        return distributionRounds.length;
    }

    function setMakerDaoAddress(address newMakerDaoAddress) public {
        makerDaoAddress = newMakerDaoAddress;
    }
}

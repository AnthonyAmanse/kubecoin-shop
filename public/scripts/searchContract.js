/*global document:false alert:false XMLHttpRequest:false */

let BLOCKCHAIN_URL = "https://cloudcoin.us-south.containers.appdomain.cloud";

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

console.log(getParameterByName("event"));

var BLOCKCHAIN_SELLER_ID = "a545e96c-9229-45ed-afce-73172a52bccb";
var eventForShop = "oredev"
eventForShop = getParameterByName("event");
if (eventForShop == "oredev") {
  BLOCKCHAIN_SELLER_ID = "a545e96c-9229-45ed-afce-73172a52bccb"
} else if (eventForShop == "thinkstockholm") {
  BLOCKCHAIN_SELLER_ID = "a4eea032-bf8f-4c6b-98f8-5b9d4cc44550"
}

let searchButton = document.getElementById("searchId");
searchButton.addEventListener("click", searchContractById);

function searchContractById() {
  var type = "query";
  var userId = BLOCKCHAIN_SELLER_ID; // SHOULD BE A SELLER ID
  var fcn = "getState";
  var args = $('#idToSearch').val().toLowerCase().split(',');
  var input = {
    type: type,
    queue: "seller_queue-" + eventForShop,
    params: {
      userId: userId,
      fcn: fcn,
      args: args
    }
  };

  console.log(input);
  requestServer(input, "query");
}

// blockchain request
function requestServer(params, queryOrInvoke) {
  $.ajax({
    url: BLOCKCHAIN_URL + "/api/execute",
    type: "POST",
    data: JSON.stringify(params),
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    success: function (data) {
      data = typeof data !== "string" ? data : JSON.parse(data);
      console.log(" Result ID " + data.resultId);
      getResults(data.resultId, 0, queryOrInvoke);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log(errorThrown);
      console.log(textStatus);
      console.log(jqXHR);
    }
  });
}

function getResults(resultId, attemptNo, queryOrInvoke) {
  if(attemptNo < 60) {
    //console.log("Attempt no " + attemptNo);
    $.get(BLOCKCHAIN_URL + "/api/results/" + resultId).done(function (data) {
      data = typeof data !== "string" ? data : JSON.parse(data);
      console.log(" Status  " + data.status);
      if(data.status === "done") {
        console.log(JSON.parse(data.result));
        if (queryOrInvoke == "query") {
          // updateDashboard(JSON.parse(data.result));
          showContract(JSON.parse(data.result));
        } else {
          // updateRightContents(JSON.parse(data.result));
          showPayload(JSON.parse(data.result));
        }
      } else {
        setTimeout(function () {
          getResults(resultId, attemptNo + 1, queryOrInvoke);
        }, 1000);
      }
    }).fail(function () {
      console.log("error");
    });
  } else {
    console.error("exceeded Number of attempts");
  }
}
// end of blockchain request

function showContract(payload) {
  if (payload.result == "") {
    console.log("contract not found");
    clearContent();

    document.getElementById("contract-quantity").innerHTML = "Contract not found..."
  } else {
    console.log(JSON.parse(payload.result));
    let contract = JSON.parse(payload.result);

    // create the image with alternate text of product name
    var image = new Image();
    image.src = "/images/" + contract.productId + ".png";
    image.alt = contract.productName;
    image.className = "productImage";

    clearContent();
    document.getElementById("contract-id").innerHTML = contract.id;
    document.getElementById("contract-quantity").innerHTML = contract.quantity + " x";
    document.getElementById("contract-product-id").appendChild(image);
    document.getElementById("contract-total-price").innerHTML = contract.cost + " kubecoins";

    if (contract.state == "pending") {
      createButtons();
    } else {
      document.getElementById("action-buttons").innerHTML = "The contract has already been fulfilled.<br/> Contract state is " + contract.state + ".";
    }
  }
}

function showPayload(payload) {
  let contractId = document.getElementById("contract-id").innerHTML;
  clearContent();
  document.getElementById("contract-id").innerHTML = contractId;
  document.getElementById("action-buttons").innerHTML = JSON.stringify(payload);
  console.log("Message is: " + payload.message);
  console.log("Blockchain Transaction id is: " + payload.result.txId);
  console.log("Contract state is: " + JSON.parse(payload.result.results.payload).state);
  let message = payload.message;

  if (message == "success") {
    let transactionId = payload.result.txId;
    let state = JSON.parse(payload.result.results.payload).state;
    var messageStatus = "Successfully completed the contract!";

    if (state == "declined") {
      messageStatus = "Successfully declined the contract!";
    }

    document.getElementById("action-buttons").innerHTML = messageStatus + "<br/>Blockchain transaction Id is:<br/>" + transactionId + ".<br/>";
  } else {
    document.getElementById("action-buttons").innerHTML = "Something went wrong..."
  }

}

function createButtons() {
  var decline = document.createElement('div');
  var complete = document.createElement('div');
  decline.className = 'actionItem';
  complete.className = 'actionItem';

  var completeButton = "<button id='confirmButton' onclick='completeContract()'>Complete</button>";
  var declineButton = "<button id='declineButton' onclick='declineContract()'>Decline</button>";

  decline.innerHTML = declineButton;
  complete.innerHTML = completeButton;
  document.getElementById("action-buttons").appendChild(decline);
  document.getElementById("action-buttons").appendChild(complete);
}

function disableButtons() {
  document.getElementById("confirmButton").disabled = true;
  document.getElementById("declineButton").disabled = true;
  document.getElementById("confirmButton").style.opacity = 0.5;
  document.getElementById("declineButton").style.opacity = 0.5;
}

function clearContent() {
  document.getElementById("contract-id").innerHTML = "";
  document.getElementById("contract-quantity").innerHTML = ""
  document.getElementById("contract-product-id").innerHTML = "";
  document.getElementById("contract-total-price").innerHTML = "";
  document.getElementById("action-buttons").innerHTML = "";
}

function completeContract() {
  var type = "invoke";
  var userId = BLOCKCHAIN_SELLER_ID; // SHOULD BE A SELLER ID
  var fcn = "transactPurchase";
  var args = document.getElementById("contract-id").innerHTML.split(',');
  args.push("complete");
  args.unshift(userId);
  var input = {
    type: type,
    queue: "seller_queue-" + eventForShop,
    params: {
      userId: userId,
      fcn: fcn,
      args: args
    }
  };

  console.log(input);
  disableButtons();
  requestServer(input, "invoke");
}

function declineContract() {
  var type = "invoke";
  var userId = BLOCKCHAIN_SELLER_ID; // SHOULD BE A SELLER ID
  var fcn = "transactPurchase";
  var args = document.getElementById("contract-id").innerHTML.split(',');
  args.push("declined");
  args.unshift(userId);
  var input = {
    type: type,
    queue: "seller_queue-" + eventForShop,
    params: {
      userId: userId,
      fcn: fcn,
      args: args
    }
  };

  console.log(input);
  disableButtons();
  requestServer(input, "invoke");
}
// function updateDashboard(receivedPayload) {
//   if (JSON.parse(receivedPayload.result).response == "") {
//     console.log("contract not found...")
//     let contractNotFound = "<div class='not-found'>Contract Not Found</div>";
//     $("div#content").text("");
//     $("div#content").addClass("not-found");
//
//     $(contractNotFound).hide().appendTo("#content").fadeIn(1000);
//   } else {
//     let contractData = JSON.parse(JSON.parse(receivedPayload.result).response);
//     console.log(contractData);
//     let tableOfContract = "<div class='contract-details'>" +
//     "<table class='contract-table'>" +
//     "<tr class='contract-id-row'><td colspan='2'><span>" + contractData['id'] + "</span><br/><span class='contract-label'>Contract ID</span></td></tr>" +
//     "<tr class='contract-user-row'><td colspan='2'><span>" + contractData['userId'] + "</span><br/><span class='contract-label'>User ID</span></td></tr>" +
//     "<tr class='contract-product-row'><td class='product-name'>" + contractData['productId'] + "</td><td class='product-quantity'><span>x " + contractData['quantity'] + "</span><br/><span class='contract-label'>Quantity</span></td></tr>" +
//     "<tr class='contract-total-row'><td colspan='2'><span>" + contractData['price'] + "</span> <span class='contract-label'> Fitcoins</span></td></tr>" +
//     "</table></div>";
//
//     let rightSide = "";
//     const state = contractData.state;
//     if (state == "pending") {
//       rightSide = "<div class='buttons'>" +
//       "<button id='complete-button' onclick='completeTransaction()'>Complete</button>" +
//       // "<span>Transaction payload?</span>" +
//       "<button id='decline-button'>Decline</button>" +
//       "</div>";
//     } else {
//       rightSide = "<div class='buttons'><div class='transaction-payload'>The transaction has already been " +
//       state + "d</div></div>";
//     }
//     $("div#content").text("");
//     $("div#content").removeClass("not-found");
//     const combinedData = tableOfContract + rightSide;
//     $(combinedData).hide().appendTo("#content").fadeIn(1000);
//   }
// }
//
// function updateRightContents(receivedPayload) {
//   $("div.buttons").text("");
//   let rightSide = "<div class='transaction-payload'>" + JSON.stringify(receivedPayload) + "</div>";
//   $(rightSide).hide().appendTo(".buttons").fadeIn(1000);
// }

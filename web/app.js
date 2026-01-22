const SATURN_ADDRESS = "0xAC55641Cbb734bdf6510d1bBd62E240c2409040f";
const STRN_ADDRESS = "0xeEd7A7fB8659663C7be8EF6985e38c62cB616Ca6";
const STRN10K_ADDRESS = "0x7d35D3938c3b4446473a4ac29351Bd93694b5DEF";
const BRIDGE_TAG = "0x4d494e54"; // "MINT"
const STRN_DECIMALS = 4;
const STRN10K_DECIMALS = 0;
const LOT_SIZE_UNITS = 10_000n * 10n ** BigInt(STRN_DECIMALS);
const ETC_CHAIN_ID = 61;

const SATURN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value, bytes data) returns (bool)"
];

const STRN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function redeem(uint256 amount) returns (bool)"
];

const STRN10K_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function deposit(uint256 strnAmount) returns (uint256)",
  "function redeem(uint256 lots) returns (uint256)"
];

const connectBtn = document.getElementById("connectBtn");
const wrapBtn = document.getElementById("wrapBtn");
const unwrapBtn = document.getElementById("unwrapBtn");
const statusEl = document.getElementById("status");
const networkEl = document.getElementById("network");
const accountEl = document.getElementById("account");
const saturnBalanceEl = document.getElementById("saturnBalance");
const strnBalanceEl = document.getElementById("strnBalance");
const saturn10kBalanceEl = document.getElementById("saturn10kBalance");
const lotsAvailableEl = document.getElementById("lotsAvailable");
const wrapModeEl = document.getElementById("wrapMode");
const wrapHintEl = document.getElementById("wrapHint");
const lotMetaEl = document.getElementById("lotMeta");
const lotHintEl = document.getElementById("lotHint");
const wrapAmountEl = document.getElementById("wrapAmount");
const unwrapModeEl = document.getElementById("unwrapMode");
const unwrapHintEl = document.getElementById("unwrapHint");
const unwrapAmountEl = document.getElementById("unwrapAmount");
const saturnAddressEl = document.getElementById("saturnAddress");
const strnAddressEl = document.getElementById("strnAddress");
const saturn10kAddressEl = document.getElementById("saturn10kAddress");

let provider;
let signer;
let account;
let saturn;
let strn;
let saturn10k;

saturnAddressEl.textContent = SATURN_ADDRESS;
strnAddressEl.textContent = STRN_ADDRESS;
saturn10kAddressEl.textContent = STRN10K_ADDRESS;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#ff6b6b" : "#e6e8ee";
}

function formatUnits(value, decimals) {
  try {
    return ethers.formatUnits(value, decimals);
  } catch {
    return "0";
  }
}

function parseUnits(value, decimals) {
  try {
    return ethers.parseUnits(value, decimals);
  } catch {
    return null;
  }
}

function syncWrapMode() {
  if (wrapModeEl.value === "saturn") {
    wrapAmountEl.placeholder = "Amount";
    wrapAmountEl.inputMode = "decimal";
    wrapHintEl.textContent =
      "Mint STRN by sending SATURN with the MINT tag. Normal sends won't work.";
    wrapBtn.textContent = "Mint STRN";
    lotMetaEl.hidden = true;
    lotHintEl.hidden = true;
  } else {
    wrapAmountEl.placeholder = "Lots";
    wrapAmountEl.inputMode = "numeric";
    wrapHintEl.textContent =
      "Mint STRN10K with STRN in exact 10,000.0000 lots.";
    wrapBtn.textContent = "Mint Lots";
    lotMetaEl.hidden = false;
    lotHintEl.hidden = false;
  }
}

function syncUnwrapMode() {
  if (unwrapModeEl.value === "saturn10k") {
    unwrapAmountEl.placeholder = "Lots";
    unwrapHintEl.textContent = "Burn STRN10K to redeem STRN.";
    unwrapAmountEl.inputMode = "numeric";
  } else {
    unwrapAmountEl.placeholder = "Amount";
    unwrapHintEl.textContent = "Burn STRN to redeem SATURN.";
    unwrapAmountEl.inputMode = "decimal";
  }
}

async function refreshBalances() {
  if (!account || !saturn || !strn || !saturn10k) return;
  const [saturnBal, strnBal, saturn10kBal] = await Promise.all([
    saturn.balanceOf(account),
    strn.balanceOf(account),
    saturn10k.balanceOf(account)
  ]);
  saturnBalanceEl.textContent = `${formatUnits(
    saturnBal,
    STRN_DECIMALS
  )} SATURN`;
  strnBalanceEl.textContent = `${formatUnits(
    strnBal,
    STRN_DECIMALS
  )} STRN`;
  saturn10kBalanceEl.textContent = `${formatUnits(
    saturn10kBal,
    STRN10K_DECIMALS
  )} STRN10K`;

  const lotsAvailable = strnBal / LOT_SIZE_UNITS;
  lotsAvailableEl.textContent = `${lotsAvailable.toString()} lots`;
}

async function connect() {
  if (!window.ethereum) {
    setStatus("MetaMask not detected", true);
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  account = await signer.getAddress();

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  networkEl.textContent = `${network.name} (${chainId})`;

  if (chainId !== ETC_CHAIN_ID) {
    setStatus("Wrong network. Switch to ETC (chainId 61).", true);
  } else {
    setStatus("Connected");
  }

  accountEl.textContent = account;
  saturn = new ethers.Contract(SATURN_ADDRESS, SATURN_ABI, signer);
  strn = new ethers.Contract(STRN_ADDRESS, STRN_ABI, signer);
  saturn10k = new ethers.Contract(STRN10K_ADDRESS, STRN10K_ABI, signer);
  syncWrapMode();
  syncUnwrapMode();
  await refreshBalances();
}

async function wrap() {
  if (!saturn || !strn || !saturn10k) return;
  const amount = wrapAmountEl.value.trim();
  if (!amount) return;

  wrapBtn.disabled = true;

  try {
    if (wrapModeEl.value === "saturn") {
      setStatus("Minting STRN...");
      const value = parseUnits(amount, STRN_DECIMALS);
      if (value === null) throw new Error("Invalid amount");
      if (value === 0n) throw new Error("Amount=0");
      const tx = await saturn["transfer(address,uint256,bytes)"](
        STRN_ADDRESS,
        value,
        BRIDGE_TAG
      );
      await tx.wait();
      setStatus("STRN minted");
    } else {
      const lots = parseUnits(amount, 0);
      if (lots === null) throw new Error("Invalid lot amount");
      if (lots === 0n) throw new Error("Lots=0");

      const strnAmount = lots * LOT_SIZE_UNITS;
      setStatus("Checking allowance...");
      const allowance = await strn.allowance(
        account,
        STRN10K_ADDRESS
      );
      if (allowance < strnAmount) {
        setStatus("Approving STRN...");
        const approveTx = await strn.approve(
          STRN10K_ADDRESS,
          strnAmount
        );
        await approveTx.wait();
      }

      setStatus("Minting lots...");
      const tx = await saturn10k.deposit(strnAmount);
      await tx.wait();
      setStatus("Lots minted");
    }
    wrapAmountEl.value = "";
    await refreshBalances();
  } catch (err) {
    const fallback =
      wrapModeEl.value === "saturn" ? "Mint failed" : "Lot mint failed";
    setStatus(err?.reason || err?.message || fallback, true);
  } finally {
    wrapBtn.disabled = false;
  }
}

async function unwrap() {
  if (!strn || !saturn10k) return;
  const amount = unwrapAmountEl.value.trim();
  if (!amount) return;

  setStatus("Redeeming...");
  unwrapBtn.disabled = true;

  try {
    let tx;
    if (unwrapModeEl.value === "saturn10k") {
      const lots = parseUnits(amount, 0);
      if (lots === null) throw new Error("Invalid lot amount");
      if (lots === 0n) throw new Error("Lots=0");
      tx = await saturn10k.redeem(lots);
    } else {
      const value = parseUnits(amount, STRN_DECIMALS);
      if (value === null) throw new Error("Invalid amount");
      if (value === 0n) throw new Error("Amount=0");
      tx = await strn.redeem(value);
    }
    await tx.wait();
    setStatus("Redeem complete");
    unwrapAmountEl.value = "";
    await refreshBalances();
  } catch (err) {
    setStatus(err?.reason || err?.message || "Redeem failed", true);
  } finally {
    unwrapBtn.disabled = false;
  }
}

connectBtn.addEventListener("click", connect);
wrapBtn.addEventListener("click", wrap);
unwrapBtn.addEventListener("click", unwrap);
wrapModeEl.addEventListener("change", syncWrapMode);
unwrapModeEl.addEventListener("change", syncUnwrapMode);

syncWrapMode();
syncUnwrapMode();

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => connect());
  window.ethereum.on("chainChanged", () => connect());
}

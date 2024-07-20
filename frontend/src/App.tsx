import React, { useEffect, useState } from "react";
import { Box, IconButton, Stack, TextField, Tooltip, Button, Typography, Grid } from "@mui/material";
import { ContentCopy as ContentCopyIcon, Wallet as WalletIcon, OpenInNew as OpenInNewIcon, Key as KeyIcon, Cloud as CloudIcon, GitHub as GitHubIcon, X as XIcon, RestorePage as RestorePageIcon } from '@mui/icons-material';
import AceEditor from "react-ace";
import 'brace/mode/json';
import { connect, disconnect } from "get-starknet";
import { Account, RpcProvider, WeierstrassSignatureType } from "starknet";
import { AccountInterface } from "starknet4";
import { LoadingButton } from "@mui/lab";

const DEFAULT_TYPED_DATA = `{
  "types": {
    "StarkNetDomain": [
      { "name": "name", "type": "felt" },
      { "name": "chainId", "type": "felt" },
      { "name": "version", "type": "felt" }
    ],
    "Message": [{ "name": "message", "type": "felt" }]
  },
  "primaryType": "Message",
  "domain": {
    "name": "MyDapp",
    "chainId": "SN_MAIN",
    "version": "0.0.1"
  },
  "message": {
    "message": "hello world!"
  }
}`;

const App: React.FC = () => {
  const [starknetProvider, setStarknetProvider] = useState<RpcProvider | null>(null);
  const [connectIsLoading, setConnectIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [accountObject, setAccountObject] = useState<Account | null>(null);
  const [typedData, setTypedData] = useState<string>(DEFAULT_TYPED_DATA);
  const [signatureIsLoading, setSignatureIsLoading] = useState(false);
  const [signature, setSignature] = useState<WeierstrassSignatureType | null>(null);
  const [copiedR, setCopiedR] = useState(false);
  const [copiedS, setCopiedS] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [verificationIsLoading, setVerificationIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const connectButtonClicked = async () => {
    setConnectIsLoading(true);
    try {
      if (!walletConnected) {
        const starknet = await connect({ modalMode: "alwaysAsk" });
        if (!starknet) throw new Error("Failed to connect wallet");

        setWalletConnected(true);
        setAccount(starknet.account);
        console.log(starknet.account);
        setAccountObject(new Account(starknetProvider!, starknet.account.address, '0x123'));
      } else {
        await disconnect();
        setWalletConnected(false);
        setAccount(null);
        setAccountObject(null);
        setSignature(null);
        setSignatureError(null);
        setVerificationResult(null);
        setVerificationError(null);
      }
    } catch (error: any) {
      console.error(error.message);
    }
    setConnectIsLoading(false);
  };

  const signButtonClicked = async () => {
    setSignatureIsLoading(true);
    setSignature(null);
    setSignatureError(null);
    setVerificationResult(null);
    setVerificationError(null);
    try {
      if (!account) throw new Error("Account not connected");

      const sig = await account.signMessage(JSON.parse(typedData), { skipDeploy: true });
      if (!sig) throw new Error("Failed to sign message");

      if (sig.length === 3) sig.shift();
      setSignature({ r: BigInt(sig[0]), s: BigInt(sig[1]) } as WeierstrassSignatureType);
    } catch (error: any) {
      setSignatureError(error.message);
    }
    setSignatureIsLoading(false);
  };

  const verifyButtonClicked = async () => {
    setVerificationIsLoading(true);
    setVerificationResult(null);
    setVerificationError(null);
    try {
      if (!accountObject) throw new Error("Account not connected");
      if (!signature) throw new Error("Signature not provided");

      const result = await accountObject.verifyMessage(JSON.parse(typedData), signature);
      setVerificationResult(result);
    } catch (error: any) {
      setVerificationError(error.message);
    }
    setVerificationIsLoading(false);
  };

  useEffect(() => {
    if (!starknetProvider) {
      setStarknetProvider(new RpcProvider({ nodeUrl: "https://starknet-mainnet.public.blastapi.io/rpc/v0_7" }));
    }
  }, [starknetProvider]);

  return (
    <Stack
      direction="column"
      spacing={2}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Stack
        direction="column"
        spacing={2}
        width="100%"
        alignItems="flex-end"
        sx={{ paddingTop: 1, paddingRight: 1 }}
      >
        <Tooltip title={walletConnected ? "Disconnect" : ""}>
          <LoadingButton
            variant="contained"
            color="primary"
            disabled={starknetProvider === null}
            loading={connectIsLoading}
            onClick={connectButtonClicked}
            startIcon={<WalletIcon />}
            sx={{ width: 200 }}
          >
            {walletConnected && account ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet"}
          </LoadingButton>
        </Tooltip>
      </Stack>

      <Stack
        spacing={2}
        direction="column"
        width="90vw"
        maxWidth={500}
        alignItems="center"
        flex="1"
      >
        <Typography variant="h5">Starknet Signature Playground</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption">Checkout the complete signature guide</Typography>
          <IconButton href="https://dev.to/bastienfaivre/a-guide-on-starknet-signatures-a3m" target="_blank" rel="noopener noreferrer">
            <OpenInNewIcon />
          </IconButton>
        </Stack>
        <AceEditor
          mode="json"
          name="typed-data-editor"
          fontSize={14}
          highlightActiveLine
          value={typedData}
          onChange={setTypedData}
          setOptions={{
            showGutter: false,
            showFoldWidgets: false,
            showLineNumbers: false,
            tabSize: 2,
          }}
          width="100%"
          maxLines={20}
        />
        <LoadingButton
          variant="contained"
          color="primary"
          disabled={!walletConnected}
          loading={signatureIsLoading}
          onClick={signButtonClicked}
          startIcon={<KeyIcon />}
        >
          Sign Typed Data
        </LoadingButton>
        {signatureError && <Typography color="error">{signatureError}</Typography>}
        <TextField
          id="r"
          label="Component r"
          fullWidth
          value={(signature ? `0x${signature.r.toString(16)}` : "")}
          InputProps={{
            endAdornment: (
              <Tooltip title="Copied!" placement="top" open={copiedR}>
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(signature!.r.toString(16));
                    setCopiedR(true);
                    setTimeout(() => setCopiedR(false), 2000);
                  }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            ),
          }}
          onChange={(e) => setSignature({ ...signature!, r: BigInt(e.target.value) } as WeierstrassSignatureType)}
          sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#000000" } }}
        />
        <TextField
          id="s"
          label="Component s"
          fullWidth
          value={(signature ? `0x${signature.s.toString(16)}` : "")}
          InputProps={{
            endAdornment: (
              <Tooltip title="Copied!" placement="top" open={copiedS}>
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(signature!.s.toString(16));
                    setCopiedS(true);
                    setTimeout(() => setCopiedS(false), 2000);
                  }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            ),
          }}
          onChange={(e) => setSignature({ ...signature!, s: BigInt(e.target.value) } as WeierstrassSignatureType)}
          sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#000000" } }}
        />
        <LoadingButton
          variant="contained"
          color="primary"
          disabled={!walletConnected || !signature}
          loading={verificationIsLoading}
          onClick={verifyButtonClicked}
          startIcon={<CloudIcon />}
        >
          Verify on-chain
        </LoadingButton>
        {verificationResult !== null && (
          <Typography color={verificationResult ? "success.main" : "error"}>
            {verificationResult ? "Signature is valid" : "Signature is invalid"}
          </Typography>
        )}
        {verificationError && <Typography color="error" align="center">{
          verificationError.includes("Contract not found") ?
            "Your account contract is not deployed! You need it to verify the signature on-chain." : verificationError
        }</Typography>}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}
        sx={{ marginTop: 'auto' }}
      >
        <Typography variant="caption">Author: <b>Bastien Faivre</b></Typography>
        <IconButton href="https://github.com/BastienFaivre" target="_blank" rel="noopener noreferrer">
          <GitHubIcon />
        </IconButton>
        <IconButton href="https://x.com/std_lock_guard" target="_blank" rel="noopener noreferrer">
          <XIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
};

export default App;

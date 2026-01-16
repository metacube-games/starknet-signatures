import React, { useState, useEffect } from "react";
import { Box, IconButton, Stack, TextField, Tooltip, Button, Typography, Grid, FormHelperText, Link } from "@mui/material";
import { ContentCopy as ContentCopyIcon, Wallet as WalletIcon, OpenInNew as OpenInNewIcon, Key as KeyIcon, Cloud as CloudIcon, GitHub as GitHubIcon, Language as LanguageIcon, RestorePage as RestorePageIcon } from '@mui/icons-material';
import AceEditor from "react-ace";
import 'brace/mode/json';
import { connect, disconnect } from "@starknet-io/get-starknet";
import { RpcProvider, AccountInterface, Signature, verifyMessageInStarknet } from "starknet";
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
    "chainId": "0x534e5f4d41494e",
    "version": "0.0.1"
  },
  "message": {
    "message": "hello world!"
  }
}`;

const App: React.FC = () => {
  const [connectIsLoading, setConnectIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [typedData, setTypedData] = useState<string>(DEFAULT_TYPED_DATA);
  const [signatureIsLoading, setSignatureIsLoading] = useState(false);
  const [signature, setSignature] = useState<{ sig: string[], copied: boolean[] } | null>(null);
  const [copied, setCopied] = useState<boolean[]>(new Array(10).fill(false)); // Dumb solution to avoid React controlled error
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [rpcUrl, setRpcUrl] = useState<string>("https://1rpc.io/starknet");
  const [verificationIsLoading, setVerificationIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const connectButtonClicked = async () => {
    setConnectIsLoading(true);
    try {
      if (!walletConnected) {
        const starknet = await connect({ modalMode: "alwaysAsk" });
        if (!starknet) throw new Error("Failed to connect wallet");

        const accounts = await starknet.request({ type: "wallet_requestAccounts" });
        if (!accounts || accounts.length === 0) throw new Error("No accounts found");

        const accountInterface: AccountInterface = {
          address: accounts[0],
          signMessage: async (typedData: any) => {
            const result = await starknet.request({
              type: "wallet_signTypedData",
              params: typedData
            });
            return result;
          }
        } as AccountInterface;

        setWalletConnected(true);
        setAccount(accountInterface);
      } else {
        await disconnect();
        setWalletConnected(false);
        setAccount(null);
        setSignature(null);
        setCopied(new Array(10).fill(false)); // Dumb solution to avoid React controlled error
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
    setCopied(new Array(10).fill(false)); // Dumb solution to avoid React controlled error
    setSignatureError(null);
    setVerificationResult(null);
    setVerificationError(null);
    try {
      if (!account) throw new Error("Account not connected");

      const sig = await account.signMessage(JSON.parse(typedData));
      if (!sig) throw new Error("Failed to sign message");

      const sigArray = Array.isArray(sig) ? sig : [sig.r, sig.s].filter(Boolean).map(String);
      setSignature({ sig: sigArray, copied: new Array(sigArray.length).fill(false) });
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
      if (!account) throw new Error("Account not connected");
      if (!signature) throw new Error("Signature not provided");
      if (!rpcUrl) throw new Error("RPC URL not provided");

      const typedDataObj = JSON.parse(typedData);

      const provider = new RpcProvider({ nodeUrl: rpcUrl });

      const isValid = await verifyMessageInStarknet(
        provider,
        typedDataObj,
        signature.sig as Signature,
        account.address
      );

      setVerificationResult(isValid);
    } catch (error: any) {
      setVerificationError(error.message);
    }
    setVerificationIsLoading(false);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const reconnectWallet = async () => {
      try {
        const starknet = await connect({ modalMode: "neverAsk" });
        if (starknet) {
          const permissions = await starknet.request({ type: "wallet_getPermissions" });
          if (permissions && permissions.length > 0) {
            const accounts = await starknet.request({ type: "wallet_requestAccounts" });
            if (accounts && accounts.length > 0) {
              const accountInterface: AccountInterface = {
                address: accounts[0],
                signMessage: async (typedData: any) => {
                  const result = await starknet.request({
                    type: "wallet_signTypedData",
                    params: typedData
                  });
                  return result;
                }
              } as AccountInterface;

              setWalletConnected(true);
              setAccount(accountInterface);
            }
          }
        }
      } catch (error) {
        console.debug("No wallet to reconnect");
      }
    };

    reconnectWallet();
  }, []);

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
        {signature ? signature.sig.map((sig, index) => (
          <TextField
            key={index}
            id={`Component #${index}`}
            label={`Component #${index}`}
            fullWidth
            value={'0x' + BigInt(sig).toString(16)}
            InputProps={{
              endAdornment: (
                <Tooltip title="Copied!" placement="top" open={signature.copied[index]}>
                  <IconButton
                    onClick={() => {
                      navigator.clipboard.writeText('0x' + BigInt(sig).toString(16));
                      setSignature((prev) => {
                        const newSignature = { ...prev! };
                        newSignature.copied[index] = true;
                        return newSignature;
                      });
                      setTimeout(() => setSignature((prev) => {
                        const newSignature = { ...prev! };
                        newSignature.copied[index] = false;
                        return newSignature;
                      }), 2000);
                    }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
            onChange={(e) => {
              try {
                BigInt(e.target.value);
              } catch {
                return;
              }
              setSignature((prev) => {
                const newSignature = { ...prev! };
                newSignature.sig[index] = e.target.value;
                return newSignature;
              });
            }}
            sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#000000" } }}
          />
        )) : null}
        <Stack spacing={0.5} width="100%">
          <TextField
            label="RPC URL for verification"
            placeholder="https://"
            fullWidth
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            error={rpcUrl.length > 0 && !isValidUrl(rpcUrl)}
          />
          <FormHelperText sx={{ textAlign: 'center' }}>
            Enter your{" "}
            <Link
              href="https://www.comparenodes.com/library/public-endpoints/starknet/"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              RPC node URL
            </Link>{" "}
            to verify the signature on-chain
          </FormHelperText>
        </Stack>
        <LoadingButton
          variant="contained"
          color="primary"
          disabled={!walletConnected || !signature || !isValidUrl(rpcUrl)}
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
        <IconButton href="https://bastienfaivre.com" target="_blank" rel="noopener noreferrer">
          <LanguageIcon />
        </IconButton>
      </Stack>
    </Stack >
  );
};

export default App;

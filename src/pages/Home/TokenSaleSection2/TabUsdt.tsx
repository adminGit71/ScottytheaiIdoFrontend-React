import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, Stack } from "@mui/material";
import { useAccount, useContractWrite, useDisconnect, useNetwork, usePrepareContractWrite, useSwitchNetwork, useWaitForTransaction } from "wagmi";
import { useDebounce } from "use-debounce";
import { toast } from "react-toastify";
import { useWeb3Modal } from "@web3modal/react";
import { Icon } from "@iconify/react";
import { parseUnits } from "viem";
import { TextField } from "../../../components/styledComponents";
import useLoading from "../../../hooks/useLoading";
import { CHAIN_ID, CONTRACT_ADDRESS, REGEX_NUMBER_VALID, TOKEN_PRICE_IN_USDT, USDT_CONTRACT_ABI, USDT_CONTRACT_ADDRESS } from "../../../utils/constants";
import api from "../../../utils/api";
import { grey } from "@mui/material/colors";

// ---------------------------------------------------------------------------------------

interface IProps {
  remainedTokenAmount: number;
}

// ---------------------------------------------------------------------------------------

export default function TabUsdt({ remainedTokenAmount }: IProps) {
  const { openLoadingAct, closeLoadingAct } = useLoading()
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const [sellAmount, setSellAmount] = useState<string>('0');
  const [buyAmount, setBuyAmount] = useState<string>('0');
  const [debouncedSellAmount] = useDebounce<string>(sellAmount, 500);

  const claimStopped = useMemo<boolean>(() => {
    const _buyAmount = Number(buyAmount || '0');

    if (remainedTokenAmount >= _buyAmount) {
      return false;
    }
    return true;
  }, [buyAmount, remainedTokenAmount]);

  /* ------------------ Send USDT from the wallet to the contract --------------- */
  const { config, error: errorOfUsePrepareContractWrite } = usePrepareContractWrite({
    address: USDT_CONTRACT_ADDRESS,
    abi: USDT_CONTRACT_ABI,
    functionName: 'transfer',
    args: [CONTRACT_ADDRESS, parseUnits(`${Number(debouncedSellAmount)}`, 6)],
    // args: [CONTRACT_ADDRESS, Number(parseUnits(`${Number(debouncedSellAmount)}`, 6))],
    // args: [CONTRACT_ADDRESS, Number(debouncedSellAmount) * 10 ** 6],
    chainId: CHAIN_ID,
  });

  console.log('>>>>>>> errorOfUsePrepareContractWrite => ', errorOfUsePrepareContractWrite)

  const { data, write } = useContractWrite(config);

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
    onSuccess: () => {
      api.post('invest/invest', {
        investor: address,
        fundTypeId: 2,
        fundAmount: Number(debouncedSellAmount),
        tokenAmount: Number(buyAmount)
      }).then(response => {
        console.log('>>>>>>>> response.data => ', response.data)
        closeLoadingAct();
        toast.success('Transaction completed.')
      }).catch(error => {
        console.log('>>>>>>>> error => ', error)
        closeLoadingAct();
        toast.error('Transaction failed.')
      });
    },
    onError: () => {
      closeLoadingAct();
    }
  });

  const handlePurchase = () => {
    write?.();
  };
  /* ------------------------------------------------------------------------------ */

  //  Input sell amount
  const handleSellAmount = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (value.match(REGEX_NUMBER_VALID)) {
      setSellAmount(value);
      setBuyAmount(String(Number(value) / TOKEN_PRICE_IN_USDT));
    }
  };

  //  Input buy amount
  const handleBuyAmount = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (value.match(REGEX_NUMBER_VALID)) {
      setBuyAmount(value);
      setSellAmount(String(Number(value) * TOKEN_PRICE_IN_USDT));
    }
  };

  useEffect(() => {
    if (isLoading) {
      openLoadingAct();
    }
  }, [isLoading]);

  return (
    <Stack alignItems="center" spacing={4}>
      {/* <Typography color={grey[100]}>USDT balance: <Typography component="span" fontWeight={700}>{balance.toFixed(2)}</Typography></Typography> */}
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Selling"
              id="sellAmount"
              name="sellAmount"
              placeholder="0"
              InputProps={{
                endAdornment: (
                  <Box
                    component="img"
                    src="https://cryptologos.cc/logos/tether-usdt-logo.svg?v=024"
                    alt="USDT"
                    width={32}
                  />
                )
              }}
              value={sellAmount}
              onChange={handleSellAmount}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Buying"
              id="buyAmount"
              name="buyAmount"
              placeholder="0"
              InputProps={{
                endAdornment: (
                  <Box
                    component="img"
                    src="/logo.svg"
                    alt="Soctty"
                    width={32}
                  />
                )
              }}
              value={buyAmount}
              onChange={handleBuyAmount}
            />
          </Grid>
        </Grid>
      </Box>
      <Stack display="grid" alignItems="center" spacing={1}>
        {isConnected ? chain?.id === CHAIN_ID ? (
          <>
            <Button
              variant="contained"
              sx={{ borderRadius: 9999, bgcolor: grey[900], px: 4 }}
              disabled={!write || claimStopped}
              onClick={handlePurchase}
            >Buy Now</Button>
            <Button
              variant="outlined"
              sx={{ borderRadius: 9999, bgcolor: grey[900], px: 4 }}
              onClick={() => disconnect()}
              endIcon={<Icon icon="heroicons-outline:logout" />}
            >
              {address?.slice(0, 7)}...{address?.slice(-5)}
            </Button>
          </>
        ) : (
          <Button variant="contained" sx={{ borderRadius: 9999, bgcolor: grey[900] }} onClick={() => switchNetwork?.(CHAIN_ID)}>
            Switch to Ethereum
          </Button>
        ) : (
          <Button
            variant="contained"
            sx={{ borderRadius: 9999, bgcolor: grey[900], px: 4 }}
            onClick={() => open()}
          >Buy Now</Button>
        )}
      </Stack>
    </Stack>
  )
}
<script lang="ts">
  import WalletAccess from '../templates/WalletAccess.svelte';
  import Button from '../components/Button.svelte';
  import {Contract} from '@ethersproject/contracts';
  import {contracts} from '../contracts.json';
  import {wallet, flow, chain} from '../stores/wallet';
  import {onMount} from 'svelte';
  import {SuperfluidSDK} from '../js-sdk/Framework';
  import {parseEther} from '@ethersproject/units';

  let creatorContract;
  let superAppContract;
  let contractAddress;
  let creator;
  let title;
  let avatarURL;
  let subscriptionPrice;
  let currentBalance;
  let isSubscribed;

  let subscriptionStatus;

  let sf;
  let usdc;
  let usdcx;
  let app;
  let usdcBalance;
  let usdcApproved;

  const APP_ADDRESS = '0x46113fF0F86A2c27151F43e7959Ff60DebC18dB1';
  const MINIMUM_GAME_FLOW_RATE = '3858024691358';
  //TODO: try this with hardhat
  //const LotterySuperApp = TruffleContract(require("./LotterySuperApp.json"));

  if (typeof window !== 'undefined') {
    contractAddress = window.location.pathname.split('/')[2];
  }

  onMount(async () => {
    if (wallet.provider) {
      console.log('does creator work');
      loadCreatorData();
      console.log('does superfluid work');
      loadSuperFluid();
    } else {
      flow.execute(async () => {
        loadCreatorData();
      });
    }
  });

  async function support() {
    usdcBalance = await usdc.balanceOf($wallet.address);
    usdcApproved = await usdcx.balanceOf($wallet.address);
    var call;
    if (usdcApproved < 2)
      call = [
        [
          2, // upgrade 100 daix to play the game
          usdcx.address,
          sf.interface._encodeParams(['uint256'], [parseEther('100').toString()]),
        ],
        [
          0, // approve collateral fee
          usdcx.address,
          sf.interface._encodeParams(['address', 'uint256'], [APP_ADDRESS, parseEther('1').toString()]),
        ],
        [
          5, // callAppAction to collateral
          app.address,
          sf.interface.encodeFunctionData('collateral', ['0x']),
        ],
        [
          4, // create constant flow (10/mo)
          sf.agreements.cfa.address,
          sf.interface.encodeFunctionData(
            'createFlow',
            [usdcx.address, app.address],
            MINIMUM_GAME_FLOW_RATE.toString(),
            '0x'
          ),
        ],
      ];
    else
      call = [
        [
          0, // approve collateral fee
          usdcx.address,
          sf.web3.eth.abi.encodeParameters(['address', 'uint256'], [APP_ADDRESS, parseEther('1').toString()]),
        ],
        [
          5, // callAppAction to collateral
          app.address,
          app.collateral('0x').encodeABI(),
        ],
        [
          4, // create constant flow (10/mo)
          sf.agreements.cfa.address,
          sf.interface.encodeFunctionData(
            'createFlow',
            [usdcx.address, app.address],
            MINIMUM_GAME_FLOW_RATE.toString(),
            '0x'
          ),
        ],
      ];
    console.log('this is the batchcall: ', call);
    await sf.host.batchCall(call);
  }

  async function loadSuperFluid() {
    sf = new SuperfluidSDK({
      chainId: 5,
      version: '0.1.2-preview-20201014',
      web3Provider: wallet.web3Provider,
    });
    await sf.initialize();

    const usdcAddress = await sf.resolver.get('tokens.fUSDC');
    usdc = await sf.contracts.TestToken.at(usdcAddress);
    const usdcxWrapper = await sf.getERC20Wrapper(usdc);
    usdcx = await sf.contracts.ISuperToken.at(usdcxWrapper.wrapperAddress);

    app = await new Contract(contractAddress, contracts.CreatonSuperApp.abi, wallet.provider.getSigner());
  }

  async function mintUSDC() {
    //mint some dai here!  100 default amount
    await usdc.mint($wallet.address, parseEther('100'), {from: $wallet.address});
    usdcBalance = await usdc.balanceOf($wallet.address);
  }

  async function approveUSDC() {
    //approve unlimited please
    await usdc
      .approve(usdcx.address, '115792089237316195423570985008687907853269984665640564039457584007913129639935', {
        from: $wallet.address,
      })
      .then(async (i) => (usdcApproved = await usdc.allowance($wallet.address, usdcx.address)));
  }

  async function loadCreatorData() {
    creatorContract = await new Contract(contractAddress, contracts.Creator.abi, wallet.provider.getSigner());

    creatorContract.on('NewSubscriber', (...response) => {
      const [address, balance] = response;
      if (address === wallet.address) {
        subscriptionStatus = 'SUBSCRIBED';
        currentBalance = balance.toNumber();
      }
    });

    creator = await creatorContract.creator();
    title = await creatorContract.creatorTitle();
    avatarURL = await creatorContract.avatarURL();
    subscriptionPrice = await creatorContract.subscriptionPrice();
    [currentBalance, isSubscribed] = await creatorContract.currentBalance(wallet.address);
    if (isSubscribed) {
      subscriptionStatus = 'SUBSCRIBED';
    } else {
      subscriptionStatus = 'UNSUBSCRIBED';
    }
  }

  async function handleSubscribe() {
    if (!subscriptionPrice) return; // todo: show error
    try {
      const receipt = await creatorContract.subscribe(subscriptionPrice);
      subscriptionStatus = 'PENDING';
      // todo: show loader and watch for event when transaction is mined
    } catch (err) {
      console.error(err);
    }
  }
</script>

<WalletAccess>
  <section class="py-8 px-4 text-center max-w-md mx-auto">
    {#if !creator || !title || !avatarURL || !subscriptionPrice}
      <div>Fetching creator...</div>
    {:else}
      <h3 class="text-4xl leading-normal font-medium text-gray-900 dark:text-gray-500 truncate">{title}</h3>
      <p class="mb-2 text-base leading-6 text-gray-500 dark:text-gray-300 text-center">{creator}</p>
      <img class="w-full" src={avatarURL} alt={title} />
      {#if subscriptionStatus === 'UNSUBSCRIBED'}
        <Button class="mt-3" on:click={support}>Subscribe - ${subscriptionPrice}</Button>
      {:else}
        <p class="mt-4 text-2xl leading-6 dark:text-gray-300 text-center">
          {#if subscriptionStatus === 'PENDING'}
            Subscription pending...
          {:else}Subscription balance: ${currentBalance}{/if}
        </p>
      {/if}
      <p class="mt-4 text-2xl leading-6 dark:text-gray-300 text-center">usdc balance: ${usdcBalance}</p>
      <p class="mt-4 text-2xl leading-6 dark:text-gray-300 text-center">approved usdc balance: ${usdcApproved}</p>
      <Button class="mt-3" on:click={mintUSDC}>mint 100 usdc</Button>
      <Button class="mt-3" on:click={approveUSDC}>approve a lot os usdc</Button>
    {/if}
  </section>
</WalletAccess>

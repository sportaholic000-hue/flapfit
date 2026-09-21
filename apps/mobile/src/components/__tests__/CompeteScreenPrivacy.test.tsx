import type { ReactTestRenderer } from 'react-test-renderer';
jest.setTimeout(20_000);
async function fixture() {
  jest.resetModules();
  const React: typeof import('react')=require('react');
  const {act}=React;
  const renderer: typeof import('react-test-renderer')=require('react-test-renderer');
  const memory=new Map<string,string>();
  const storage={getItem:jest.fn(async (key:string)=>memory.get(key)??null),setItem:jest.fn(async (key:string,value:string)=>{memory.set(key,value);})};
  jest.doMock('@react-native-async-storage/async-storage',()=>storage);
  jest.doMock('react-native',()=>({View:'View',Text:'Text',TextInput:'TextInput',TouchableOpacity:'TouchableOpacity',Modal:'Modal',ScrollView:'ScrollView',Platform:{OS:'ios'},Alert:{alert:jest.fn()},Linking:{openURL:jest.fn()}}));
  jest.doMock('expo-router',()=>({useFocusEffect:(callback:()=>void)=>React.useEffect(callback,[callback])}));
  jest.doMock('expo-image',()=>({Image:'Image'}));
  jest.doMock('expo-status-bar',()=>({StatusBar:'StatusBar'}));
  jest.doMock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:0})}));
  jest.doMock('lucide-react-native',()=>({CheckCircle2:'Icon',FileText:'Icon',Medal:'Icon',RefreshCw:'Icon',Trophy:'Icon'}));
  jest.doMock('@/components/KeyboardAvoidingAnimatedView',()=>({__esModule:true,default:'KeyboardAvoidingAnimatedView'}));
  jest.doMock('@/utils/game/exerciseImages',()=>({EXERCISE_IMAGES:{pushups:1,squats:2,pullups:3}}));
  jest.doMock('@/config/release',()=>({RELEASE_LINKS:{privacyUrl:'https://flapfitapp.com/privacy/',termsUrl:'https://flapfitapp.com/terms/'}}));
  const client={invalidateQueries:jest.fn()};
  jest.doMock('@tanstack/react-query',()=>({useQuery:()=>({data:[],isLoading:false}),useQueryClient:()=>client}));
  const prepare=jest.fn().mockResolvedValue(undefined);
  jest.doMock('@/services/monetization',()=>({prepareCompetitionEligibility:prepare}));
  jest.doMock('@/services/competitionApi',()=>({competitionIsConfigured:true,competitionPlayerNameError:()=>null,competitionRequest:jest.fn(),consumeCompetitionSubmissionNotices:jest.fn().mockResolvedValue([]),flushPendingCompetitionResults:jest.fn().mockResolvedValue({submitted:0,rejected:[]}),normalizeCompetitionPlayerName:(name:string)=>name}));
  const state={hydrated:true,playerName:'Tester',setPlayerName:jest.fn(),competitionTermsVersion:0,acceptCompetitionTerms:jest.fn(()=>{state.competitionTermsVersion=1;})};
  jest.doMock('@/utils/game/store',()=>({COMPETITION_TERMS_VERSION:1,useGameStore:(select:(value:typeof state)=>unknown)=>select(state)}));
  const access:typeof import('@/services/privacy/processingAccess')=require('@/services/privacy/processingAccess');
  await access.hydrateProcessingAccess();
  const Screen=require('../../app/(tabs)/compete').default;
  let tree:ReactTestRenderer;
  await act(async()=>{tree=renderer.create(React.createElement(Screen));});
  const modal=()=>tree.root.findByType('Modal' as never);
  const press=async(text:string)=>{const button=tree.root.findAllByType('TouchableOpacity' as never).find(node=>node.findAllByType('Text' as never).some(t=>t.children.join('')===text));expect(button).toBeDefined();await act(async()=>{button!.props.onPress();});};
  return {access,state,storage,memory,prepare,modal,press,act,unmount:async()=>{await act(async()=>tree.unmount());}};
}
test('actual Compete acceptance saves only competition and waits for native terms dismissal before eligibility',async()=>{
  const f=await fixture();
  expect(f.prepare).not.toHaveBeenCalled();
  await f.press('Review and accept');
  // The real modal's existing affirmative action, not an injected purpose grant.
  await f.press('I Agree');
  expect(f.state.acceptCompetitionTerms).toHaveBeenCalledTimes(1);
  expect(f.access.getProcessingInputs().choices).toMatchObject({competition:{decision:'granted'},ads:{decision:'unset'},analytics:{decision:'unset'}});
  expect(f.modal().props.visible).toBe(false); expect(f.prepare).not.toHaveBeenCalled();
  await f.act(async()=>f.modal().props.onDismiss());
  expect(f.prepare).toHaveBeenCalledTimes(1);
  const canPresent=f.prepare.mock.calls[0][0]; expect(canPresent()).toBe(true);
  await f.unmount(); expect(canPresent()).toBe(false);
});
test('failed Compete acceptance keeps the real modal open and does not request native eligibility',async()=>{
  const f=await fixture(); await f.press('Review and accept');
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full')); await f.press('I Agree');
  expect(f.modal().props.visible).toBe(true);expect(f.prepare).not.toHaveBeenCalled();expect(f.state.acceptCompetitionTerms).not.toHaveBeenCalled();
  await f.press('I Agree');await f.act(async()=>f.modal().props.onDismiss());
  expect(f.prepare).toHaveBeenCalledTimes(1);await f.unmount();
});

test('a newer Stop defeats actual I Agree while an older Stop save is pending, including restart',async()=>{
  const f=await fixture();
  const rights:typeof import('@/services/privacy/privacyRights')=require('@/services/privacy/privacyRights');
  let release!:()=>void;
  const saving=new Promise<void>(resolve=>{release=resolve;});
  const write=f.storage.setItem.getMockImplementation()!;
  f.storage.setItem.mockImplementationOnce(async(key,value)=>{await saving;await write(key,value);});
  let first!:ReturnType<typeof rights.stopOnlineCompetition>;
  await f.act(async()=>{first=rights.stopOnlineCompetition();});
  await f.press('Review and accept');
  await f.press('I Agree');
  expect(f.access.getProcessingInputs().choices.competition.decision).toBe('denied');
  let latest!:ReturnType<typeof rights.stopOnlineCompetition>;
  await f.act(async()=>{latest=rights.stopOnlineCompetition();});
  // Capture the outcome before asserting so all pending saves are drained on failure.
  const reused=latest===first;
  await f.act(async()=>{release();await Promise.all([first,latest]);});
  expect(reused).toBe(false);
  expect(f.access.getProcessingInputs().choices.competition.decision).toBe('denied');
  expect(f.state.acceptCompetitionTerms).not.toHaveBeenCalled();
  expect(f.prepare).not.toHaveBeenCalled();
  expect(f.modal().props.visible).toBe(true);
  expect(JSON.parse(f.memory.get('@flapfit/processing-choices-v1')!).choices.competition.decision).toBe('denied');
  await f.unmount();
  jest.resetModules();
  const restarted:typeof import('@/services/privacy/processingAccess')=require('@/services/privacy/processingAccess');
  await restarted.hydrateProcessingAccess();
  expect(restarted.getProcessingInputs().choices.competition.decision).toBe('denied');
});

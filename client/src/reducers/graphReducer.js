import produce from 'immer';

export const graphReducer  = produce(
    (draft, action) => {
        switch(action.type) {
            case "FETCH_INIT":
                draft.isLoading = true;
                draft.isError = false;
                break;
            case "FETCH_SUCCESS_INIT":
                draft.isLoading = false;
                draft.isError = false;
                draft.data = action.payload.data;
                draft.claims = action.payload.claims;
                draft.clustered = action.payload.clustered;
                draft.topics = action.payload.topics;
                break;
            case "FETCH_SUCCESS_CLUSTER":
                draft.isLoading = false;
                draft.isError = false;
                draft.data = action.payload.data;
                draft.topics = action.payload.topics;
                break;
            case "FETCH_FAILURE":
                draft.isLoading = false;
                draft.isError = true;
                break;
            default:
                break;
        }
    },
    {
        data: [],
        claims: [], // original data
        topics: [],
        clustered: false,
        isLoading: false,
        isError: false,
    }
);
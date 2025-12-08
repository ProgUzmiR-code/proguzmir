import Vue from "vue";
import vailcode from "@utils/errcode";
import cookie from "js-cookie";
import querystring from "querystring";

export default {
  namespaced: true,
  state: {
    timerObjs: {
      giftPage: {
        giftStarTimer: null,
        getTelegramNFTTimer: null,
      },
      NFTPage: {
        NFTPayTimer: null,
        NFTDailyTimer: null,
        NFTLuckyTimer: null,
      },
    },
    pageVar: {
      popNftBannerShow: false,
      popForturnShow: false,
      popMpayShow: false,
      popGiftLuckyShow: false,
      popUsdEventShow: false,
    },
    taskList: [],
    advList: [],
    selectTab: 0,
    prepare: null,
    taskInfo: null,
    mpayTaskInfo: {
      taskInfo: null,
    },
  },
  mutations: {
    setTaskList: (state, payload) => {
      state.taskList = payload;
    },
    setAdvList: (state, payload) => {
      state.advList = payload;
    },
    setSelectTab: (state, payload) => {
      state.selectTab = payload;
    },
    setTaskComplete: (state, payload) => {
      state.taskList.forEach((item, index) => {
        if (item.id == payload.id) {
          state.taskList[index].completed = 1;
        }
      });
    },
    setPrepare: (state, payload) => {
      state.prepare = payload;
    },
    setTaskInfo: (state, payload) => {
      state.taskInfo = payload;
    },
  },
  actions: {
    getTaskList: async ({ state, commit, dispatch }) => {
      const rs = await Vue.prototype.$http.post("/task/list", { adv: 0 });
      vailcode(rs, async () => {
        commit("setTaskList", rs.data);
      });
    },
    getSubTaskList: async ({ state, commit, dispatch }, [taskId, callback]) => {
      const rs = await Vue.prototype.$http.post("/task/list", { sub: 1, taskId });
      vailcode(rs, async () => {
        typeof callback == "function" && callback(rs.data);
      });
    },
    getAdvList: async ({ state, commit, dispatch }) => {
      const rs = await Vue.prototype.$http.post("/task/list", { adv: 1 });
      vailcode(rs, async () => {
        commit("setAdvList", rs.data);
      });
    },
    getTaskInfo: async ({ state, commit }, [taskId, callback, failcallback]) => {
      const rs = await Vue.prototype.$http.post("/task/info", { id: taskId });
      vailcode(
        rs,
        () => {
          commit("setTaskInfo", rs.data);
          typeof callback == "function" && callback(rs.data);
        },
        () => {
          typeof failcallback == "function" && failcallback(rs);
        }
      );
    },
    doTask: async ({ state, commit }, [taskId, code, value, callback, failcallback]) => {
      const rs = await Vue.prototype.$http.post("/task/complete", { taskId: taskId, code: code, value: value });
      vailcode(
        rs,
        () => {
          typeof callback == "function" && callback(rs.data);
        },
        () => {
          typeof failcallback == "function" && failcallback(rs);
        }
      );
    },
    doSubTask: async ({ state, commit }, [taskId, code, value, callback, failcallback]) => {
      const rs = await Vue.prototype.$http.post("/task/complete", { sub: 1, taskId: taskId, code: code, value: value });
      vailcode(
        rs,
        () => {
          typeof callback == "function" && callback(rs.data);
        },
        () => {
          typeof failcallback == "function" && failcallback(rs);
        }
      );
    },
    taskClick: async ({ state, commit }, taskId) => {
      const rs = await Vue.prototype.$http.post("/task/click ", { taskId: taskId });
    },
    getPrepare: async ({ state, commit }, [taskId, kind, value, address, callback, failcallback]) => {
      const rs = await Vue.prototype.$http.post("/task/prepare", { taskId, kind, value, address });
      vailcode(
        rs,
        () => {
          commit("setPrepare", rs.data);
          typeof callback == "function" && callback(rs.data);
        },
        () => {
          typeof failcallback == "function" && failcallback(rs);
        }
      );
    },
    getTaskMpayInfo: async ({ state, commit }) => {
      return new Promise(async (resolve) => {
        const res = await _v.$http.post("/mpay/task/info", {});
        vailcode(
          res,
          () => {
            const data = res.data;
            console.log(6666666666666);
            if (!data) {
              resolve();
              return;
            }
            state.mpayTaskInfo.taskInfo = data;

            resolve(data);
          },
          () => {
            resolve();
          }
        );
      });
    },
  },
  getters: {},
};

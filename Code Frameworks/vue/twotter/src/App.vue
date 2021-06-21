<template> {{ user.username }} {{ fullName }} {{ followers }} </template>

<script>
import HelloWorld from "./components/HelloWorld.vue";

export default {
  name: "App",
  data() {
    return {
      followers: 0,
      user: {
        id: 1,
        username: "imjakr6",
        firstName: "Jake",
        lastName: "Lund",
        email: "jakeandrewlund@hotmail.com",
        isAdmin: true,
      },
    };
  },
  computed: {
    fullName() {
      return `${this.user.firstName} ${this.user.lastName}`;
    },
  },
  components: {
    HelloWorld,
  },
  
  methods: {
    followUser() {
      this.followers++;
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

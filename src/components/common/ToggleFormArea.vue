<template>
  <div class="toggle-form-area">
    <div class="header" @click="toggleContent = !toggleContent">
      <button v-if="!hideToggle" @click.prevent class="btn toggle-btn">
        <i class="material-symbols-outlined">{{ toggleIcon }}</i>
      </button>
      <slot name="header" />
    </div>
    <transition @before-enter="beforeEnter" @enter="enter" @before-leave="beforeLeave" @leave="leave">
      <div class="body" v-if="toggleContent">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
export default {
  props: ["expanded", "hideToggle"],
  mounted() {
    this.toggleContent = !!this.expanded;
  },
  data() {
    return {
      toggleContent: false,
    };
  },
  watch: {
    expanded() {
      this.toggleContent = this.expanded;
      this.$emit("expanded", this.expanded);
    },
  },
  computed: {
    toggleIcon() {
      return this.toggleContent
        ? "keyboard_arrow_down"
        : "keyboard_arrow_right";
    },
  },
  methods: {
    beforeEnter(el) {
      el.style.height = "0";
      el.style.opacity = "0"; // Set initial opacity
    },
    enter(el, done) {
      // get height
      const height = el.scrollHeight + "px";

      // animate
      el.style.transitionProperty = "height, opacity"; // Animate both height and opacity
      el.style.transitionDuration = "0.5s";
      el.style.transitionTimingFunction = "ease-in-out";
      el.style.height = height;
      el.style.opacity = "1"; // Fade in

      // cleanup after animation
      el.addEventListener("transitionend", (...args) => {
        el.style.height = "auto";
        done(...args);
      });
    },
    beforeLeave(el) {
      el.style.height = el.scrollHeight + "px";
      el.style.opacity = "1"; // Set initial opacity
    },
    leave(el, done) {
      el.style.height = "0";
      el.style.opacity = "0"; // Fade out

      el.addEventListener("transitionend", done);
    },
  },
};
</script>

<template>
  <div class="dropdown-container">
    <button
      ref="trigger"
      class="dropdown-trigger"
      :aria-label="ariaLabel"
      @click="toggleDropdown"
    >
      <slot name="trigger">{{ displayText }}</slot>
    </button>
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdown"
        class="dropdown-popover"
        @click="handleDropdownClick"
      >
        <slot></slot>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { Model } from "@/stores/chat";

export default {
  name: "Dropdown",
  props: {
    modelValue: {
      type: Object as PropType<Model>,
      default: null,
    },
    placeholder: {
      type: String,
      default: "Select option",
    },
    ariaLabel: {
      type: String,
      default: "",
    },
  },
  computed: {
    displayText() {
      return this.modelValue?.id || this.placeholder;
    },
  },
  data() {
    return {
      isOpen: false,
    };
  },
  mounted() {
    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleKeydown);
  },
  
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeydown);
  },
  
  methods: {
    toggleDropdown() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.$nextTick(() => {
          this.positionDropdown();
        });
      }
    },
    
    close() {
      this.isOpen = false;
    },
    
    handleDropdownClick(event: Event) {
      const target = event.target as HTMLElement;
      // Close dropdown when clicking on options or actions
      if (target.closest('.dropdown-option') || target.closest('.dropdown-action')) {
        this.close();
      }
    },
    
    handleOutsideClick(event: Event) {
      if (this.isOpen) {
        const target = event.target as HTMLElement;
        if (!this.$el.contains(target) && !this.$refs.dropdown?.contains(target)) {
          this.close();
        }
      }
    },
    
    handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
      }
    },
    
    positionDropdown() {
      const trigger = this.$refs.trigger as HTMLElement;
      const dropdown = this.$refs.dropdown as HTMLElement;
      
      if (!trigger || !dropdown) return;
      
      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = triggerRect.left;
      let top = triggerRect.bottom + 5;
      
      // Calculate available space
      const spaceBelow = viewportHeight - triggerRect.bottom - 20; // 20px margin
      const spaceAbove = triggerRect.top - 20; // 20px margin
      
      // Set max height to prevent overflow
      const maxHeight = Math.max(spaceBelow, spaceAbove);
      dropdown.style.maxHeight = `${maxHeight}px`;
      dropdown.style.overflowY = 'auto';
      
      // Get updated dropdown dimensions after setting max-height
      const dropdownRect = dropdown.getBoundingClientRect();
      
      if (dropdownRect.height > spaceBelow && spaceAbove > spaceBelow) {
        // Position above trigger
        top = triggerRect.top - dropdownRect.height - 5;
        dropdown.style.maxHeight = `${spaceAbove}px`;
      }
      
      // Check horizontal positioning
      if (left + dropdownRect.width > viewportWidth) {
        left = triggerRect.right - dropdownRect.width;
      }
      
      if (left < 0) {
        left = 10;
      }
      
      // Final bounds check
      if (top < 10) {
        top = 10;
      }
      
      dropdown.style.left = `${left}px`;
      dropdown.style.top = `${top}px`;
    },
  },
};
</script>


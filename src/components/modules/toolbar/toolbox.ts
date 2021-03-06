import Module from "../../__module";
import $ from "../../dom";
import * as _ from "../../utils";
import { BlockToolConstructable } from "../../../../types";
import Flipper from "../../flipper";
import { BlockToolAPI } from "../../block";
import I18n from "../../i18n";
import { I18nInternalNS } from "../../i18n/namespace-internal";

/**
 * @class Toolbox
 * @classdesc Holder for Tools
 *
 * @typedef {Toolbox} Toolbox
 * @property {boolean} opened - opening state
 * @property {object} nodes   - Toolbox nodes
 * @property {object} CSS     - CSS class names
 *
 */
export default class Toolbox extends Module {
  /**
   * CSS styles
   *
   * @returns {object.<string, string>}
   */
  public get CSS(): { [name: string]: string } {
    return {
      toolbox: "ce-toolbox",
      toolboxButton: "ce-toolbox__button",
      toolboxButtonIcon: "ce-toolbox__button-icon",
      toolboxButtonTitle: "ce-toolbox__button-title",
      toolboxButtonActive: "ce-toolbox__button--active",
      toolboxOpened: "ce-toolbox--opened",
      openedToolbarHolderModifier: "codex-editor--toolbox-opened",

      buttonTooltip: "ce-toolbox-button-tooltip",
      buttonShortcut: "ce-toolbox-button-tooltip__shortcut",
    };
  }

  /**
   * Returns True if Toolbox is Empty and nothing to show
   *
   * @returns {boolean}
   */
  public get isEmpty(): boolean {
    return this.displayedToolsCount === 0;
  }

  /**
   * Opening state
   *
   * @type {boolean}
   */
  public opened = false;

  /**
   * HTMLElements used for Toolbox UI
   */
  public nodes: {
    toolbox: HTMLElement;
    buttons: HTMLElement[];
  } = {
    toolbox: null,
    buttons: [],
  };

  /**
   * How many tools displayed in Toolbox
   *
   * @type {number}
   */
  private displayedToolsCount = 0;

  /**
   * Instance of class that responses for leafing buttons by arrows/tab
   *
   * @type {Flipper|null}
   */
  private flipper: Flipper = null;

  /**
   * Makes the Toolbox
   */
  public make(): void {
    this.nodes.toolbox = $.make("div", this.CSS.toolbox);
    $.append(this.Editor.Toolbar.nodes.content, this.nodes.toolbox);

    this.Editor.Listeners.on(
      this.Editor.Toolbar.nodes.select,
      "change",
      (event: ProgressEvent<HTMLSelectElement>) => {
        const { value } = event.target;

        this.toolButtonActivate(event, value);
      }
    );

    this.addTools();
    this.enableFlipper();
  }

  /**
   * Toolbox Tool's button click handler
   *
   * @param {MouseEvent|KeyboardEvent} event - event that activates toolbox button
   * @param {string} toolName - button to activate
   */
  public toolButtonActivate(
    event: MouseEvent | KeyboardEvent | ProgressEvent<HTMLSelectElement>,
    toolName: string
  ): void {
    const tool = this.Editor.Tools.toolsClasses[
      toolName
    ] as BlockToolConstructable;

    this.insertNewBlock(tool, toolName);
  }

  /**
   * Open Toolbox with Tools
   */
  public open(): void {
    if (this.isEmpty) {
      return;
    }

    this.Editor.UI.nodes.wrapper.classList.add(
      this.CSS.openedToolbarHolderModifier
    );
    this.nodes.toolbox.classList.add(this.CSS.toolboxOpened);

    this.opened = true;
    this.flipper.activate();
  }

  /**
   * Close Toolbox
   */
  public close(): void {
    this.nodes.toolbox.classList.remove(this.CSS.toolboxOpened);
    this.Editor.UI.nodes.wrapper.classList.remove(
      this.CSS.openedToolbarHolderModifier
    );

    this.opened = false;
    this.flipper.deactivate();
  }

  /**
   * Close Toolbox
   */
  public toggle(): void {
    if (!this.opened) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Iterates available tools and appends them to the Toolbox
   */
  private addTools(): void {
    const tools = this.Editor.Tools.available;

    for (const toolName in tools) {
      if (Object.prototype.hasOwnProperty.call(tools, toolName)) {
        this.addTool(toolName, tools[toolName] as BlockToolConstructable);
      }
    }
  }

  /**
   * Append Tool to the Toolbox
   *
   * @param {string} toolName - tool name
   * @param {BlockToolConstructable} tool - tool class
   */
  private addTool(toolName: string, tool: BlockToolConstructable): void {
    const internalSettings = this.Editor.Tools.INTERNAL_SETTINGS;
    const userSettings = this.Editor.Tools.USER_SETTINGS;

    const toolToolboxSettings = tool[internalSettings.TOOLBOX];

    /**
     * Skip tools that don't pass 'toolbox' property
     */
    if (_.isEmpty(toolToolboxSettings)) {
      return;
    }

    if (toolToolboxSettings && !toolToolboxSettings.icon) {
      _.log("Toolbar icon is missed. Tool %o skipped", "warn", toolName);

      return;
    }

    /**
     * @todo Add checkup for the render method
     */
    // if (typeof tool.render !== 'function') {
    //   _.log('render method missed. Tool %o skipped', 'warn', tool);
    //   return;
    // }

    const userToolboxSettings =
      this.Editor.Tools.getToolSettings(toolName)[userSettings.TOOLBOX] || {};

    const button = $.make("li", [this.CSS.toolboxButton]);
    const Icon = $.make("span", [this.CSS.toolboxButtonIcon]);
    const Title = $.make("span", [this.CSS.toolboxButtonTitle]);

    button.dataset.tool = toolName;

    Icon.innerHTML = userToolboxSettings.icon || toolToolboxSettings.icon;
    Title.innerHTML = toolToolboxSettings.title;
    button.appendChild(Icon);
    button.appendChild(Title);

    $.append(this.nodes.toolbox, button);

    this.nodes.toolbox.appendChild(button);
    this.nodes.buttons.push(button);

    const select = this.Editor.Toolbar.nodes.select;
    const option = $.make("option", []);

    option.innerHTML = toolToolboxSettings.title;
    (option as HTMLSelectElement).value = toolName;

    $.append(select, option);

    /**
     * Add click listener
     */
    this.Editor.Listeners.on(
      button,
      "click",
      (event: KeyboardEvent | MouseEvent) => {
        console.log(toolName);
        this.toolButtonActivate(event, toolName);
      }
    );

    /**
     * Enable shortcut
     */
    const toolSettings = this.Editor.Tools.getToolSettings(toolName);

    if (
      toolSettings &&
      toolSettings[this.Editor.Tools.USER_SETTINGS.SHORTCUT]
    ) {
      this.enableShortcut(
        tool,
        toolName,
        toolSettings[this.Editor.Tools.USER_SETTINGS.SHORTCUT]
      );
    }

    /** Increment Tools count */
    this.displayedToolsCount++;
  }

  /**
   * Enable shortcut Block Tool implemented shortcut
   *
   * @param {BlockToolConstructable} tool - Tool class
   * @param {string} toolName - Tool name
   * @param {string} shortcut - shortcut according to the ShortcutData Module format
   */
  private enableShortcut(
    tool: BlockToolConstructable,
    toolName: string,
    shortcut: string
  ): void {
    this.Editor.Shortcuts.add({
      name: shortcut,
      handler: (event: KeyboardEvent) => {
        event.preventDefault();
        this.insertNewBlock(tool, toolName);
      },
    });
  }

  /**
   * Creates Flipper instance to be able to leaf tools
   */
  private enableFlipper(): void {
    const tools = Array.from(this.nodes.toolbox.childNodes) as HTMLElement[];

    this.flipper = new Flipper({
      items: tools,
      focusedItemClass: this.CSS.toolboxButtonActive,
    });
  }

  /**
   * Inserts new block
   * Can be called when button clicked on Toolbox or by ShortcutData
   *
   * @param {BlockToolConstructable} tool - Tool Class
   * @param {string} toolName - Tool name
   */
  private insertNewBlock(tool: BlockToolConstructable, toolName: string): void {
    const { BlockManager, Caret } = this.Editor;
    const { currentBlock } = BlockManager;

    const newBlock = BlockManager.insert({
      tool: toolName,
      replace: currentBlock.isEmpty,
    });

    /**
     * Apply callback before inserting html
     */
    newBlock.call(BlockToolAPI.APPEND_CALLBACK);

    this.Editor.Caret.setToBlock(newBlock);

    /** If new block doesn't contain inpus, insert new paragraph above */
    if (newBlock.inputs.length === 0) {
      if (newBlock === BlockManager.lastBlock) {
        BlockManager.insertAtEnd();
        Caret.setToBlock(BlockManager.lastBlock);
      } else {
        Caret.setToBlock(BlockManager.nextBlock);
      }
    }

    /**
     * close toolbar when node is changed
     */
    this.Editor.Toolbar.close();
  }
}

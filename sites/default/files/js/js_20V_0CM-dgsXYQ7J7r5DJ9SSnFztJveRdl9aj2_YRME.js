(function ($) {

Drupal.prettify = Drupal.prettify || {};
  
/**
 * Attach prettify loader behavior.
 */
Drupal.behaviors.prettify = {
  attach: function (context) {  
    if (Drupal.settings.prettify.match) {
      context = Drupal.settings.prettify.match;
    }
  
    if (Drupal.settings.prettify.markup['code']) {
      // Selector for <code>...</code>
      $("code:not(.prettyprint)", context).not($("pre > code", context)).each(function () {
        Drupal.prettify.prettifyBlock($(this));
      });
    }
    if (Drupal.settings.prettify.markup['pre']) {
      // Selector for <pre>...</pre>
      $("pre:not(.prettyprint)", context).each(function () {
        Drupal.prettify.prettifyBlock($(this));
      });
    }
    else if (Drupal.settings.prettify.markup['precode']) {
      // Selector for <pre><code>...</code></pre>
      $("pre:not(.prettyprint) > code", context).parent().each(function () {
        Drupal.prettify.prettifyBlock($(this));
      });
    }
    
    // Process custom markup selectors
    for (var i = 0; i < Drupal.settings.prettify.custom.length; i++) {
      var selector = Drupal.settings.prettify.custom[i];
      if (selector) {
        $(selector, context).each(function () {
          if (!$(this).hasClass('prettyprint')) {
            codeBlock = $(this).parent().is('pre') ? $(this).parent() : $(this);
            Drupal.prettify.prettifyBlock(codeBlock);
          }
        });
      }      
    }
  
    if ($(".prettyprint").length > 0) {
      prettyPrint();
    }
  }
};

Drupal.prettify.prettifyBlock = function(codeBlock) {
  if (!codeBlock.hasClass(Drupal.settings.prettify.nocode)) {
    codeBlock.addClass("prettyprint");
    if (Drupal.settings.prettify.linenums && codeBlock.is('pre')) {
      codeBlock.addClass("linenums");
    }
  }
}

})(jQuery);
;
(function ($) {

/**
 * Attaches sticky table headers.
 */
Drupal.behaviors.tableHeader = {
  attach: function (context, settings) {
    if (!$.support.positionFixed) {
      return;
    }

    $('table.sticky-enabled', context).once('tableheader', function () {
      $(this).data("drupal-tableheader", new Drupal.tableHeader(this));
    });
  }
};

/**
 * Constructor for the tableHeader object. Provides sticky table headers.
 *
 * @param table
 *   DOM object for the table to add a sticky header to.
 */
Drupal.tableHeader = function (table) {
  var self = this;

  this.originalTable = $(table);
  this.originalHeader = $(table).children('thead');
  this.originalHeaderCells = this.originalHeader.find('> tr > th');
  this.displayWeight = null;

  // React to columns change to avoid making checks in the scroll callback.
  this.originalTable.bind('columnschange', function (e, display) {
    // This will force header size to be calculated on scroll.
    self.widthCalculated = (self.displayWeight !== null && self.displayWeight === display);
    self.displayWeight = display;
  });

  // Clone the table header so it inherits original jQuery properties. Hide
  // the table to avoid a flash of the header clone upon page load.
  this.stickyTable = $('<table class="sticky-header"/>')
    .insertBefore(this.originalTable)
    .css({ position: 'fixed', top: '0px' });
  this.stickyHeader = this.originalHeader.clone(true)
    .hide()
    .appendTo(this.stickyTable);
  this.stickyHeaderCells = this.stickyHeader.find('> tr > th');

  this.originalTable.addClass('sticky-table');
  $(window)
    .bind('scroll.drupal-tableheader', $.proxy(this, 'eventhandlerRecalculateStickyHeader'))
    .bind('resize.drupal-tableheader', { calculateWidth: true }, $.proxy(this, 'eventhandlerRecalculateStickyHeader'))
    // Make sure the anchor being scrolled into view is not hidden beneath the
    // sticky table header. Adjust the scrollTop if it does.
    .bind('drupalDisplaceAnchor.drupal-tableheader', function () {
      window.scrollBy(0, -self.stickyTable.outerHeight());
    })
    // Make sure the element being focused is not hidden beneath the sticky
    // table header. Adjust the scrollTop if it does.
    .bind('drupalDisplaceFocus.drupal-tableheader', function (event) {
      if (self.stickyVisible && event.clientY < (self.stickyOffsetTop + self.stickyTable.outerHeight()) && event.$target.closest('sticky-header').length === 0) {
        window.scrollBy(0, -self.stickyTable.outerHeight());
      }
    })
    .triggerHandler('resize.drupal-tableheader');

  // We hid the header to avoid it showing up erroneously on page load;
  // we need to unhide it now so that it will show up when expected.
  this.stickyHeader.show();
};

/**
 * Call the header offset function to prevent use of eval().
 *
 * @param accessor
 *   The callback function name.
 * @return
 *   The callback result.
 */
Drupal.tableHeader.callHeaderOffsetFunction = function(accessor) {
  accessor = accessor.split('.');
  var callback = window;
  for (var i = 0, len = accessor.length - 1; i < len; i++) {
    if (typeof callback[accessor[i]] !== 'function' && typeof callback[accessor[i]] != 'object') {
      return 0;
    }
    callback = callback[accessor[i]];
  }
  if (typeof callback[accessor[accessor.length - 1]] === 'function') {
    return callback[accessor[accessor.length - 1]]();
  }
  return 0;
};

/**
 * Event handler: recalculates position of the sticky table header.
 *
 * @param event
 *   Event being triggered.
 */
Drupal.tableHeader.prototype.eventhandlerRecalculateStickyHeader = function (event) {
  var self = this;
  var calculateWidth = event.data && event.data.calculateWidth;

  // Reset top position of sticky table headers to the current top offset.
  this.stickyOffsetTop = Drupal.settings.tableHeaderOffset ? Drupal.tableHeader.callHeaderOffsetFunction(Drupal.settings.tableHeaderOffset) : 0;
  this.stickyTable.css('top', this.stickyOffsetTop + 'px');

  // Save positioning data.
  var viewHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
  if (calculateWidth || this.viewHeight !== viewHeight) {
    this.viewHeight = viewHeight;
    this.vPosition = this.originalTable.offset().top - 4 - this.stickyOffsetTop;
    this.hPosition = this.originalTable.offset().left;
    this.vLength = this.originalTable[0].clientHeight - 100;
    calculateWidth = true;
  }

  // Track horizontal positioning relative to the viewport and set visibility.
  var hScroll = document.documentElement.scrollLeft || document.body.scrollLeft;
  var vOffset = (document.documentElement.scrollTop || document.body.scrollTop) - this.vPosition;
  this.stickyVisible = vOffset > 0 && vOffset < this.vLength;
  this.stickyTable.css({ left: (-hScroll + this.hPosition) + 'px', visibility: this.stickyVisible ? 'visible' : 'hidden' });

  // Only perform expensive calculations if the sticky header is actually
  // visible or when forced.
  if (this.stickyVisible && (calculateWidth || !this.widthCalculated)) {
    this.widthCalculated = true;
    var $that = null;
    var $stickyCell = null;
    var display = null;
    var cellWidth = null;
    // Resize header and its cell widths.
    // Only apply width to visible table cells. This prevents the header from
    // displaying incorrectly when the sticky header is no longer visible.
    for (var i = 0, il = this.originalHeaderCells.length; i < il; i += 1) {
      $that = $(this.originalHeaderCells[i]);
      $stickyCell = this.stickyHeaderCells.eq($that.index());
      display = $that.css('display');
      if (display !== 'none') {
        cellWidth = $that.css('width');
        // Exception for IE7.
        if (cellWidth === 'auto') {
          cellWidth = $that[0].clientWidth + 'px';
        }
        $stickyCell.css({'width': cellWidth, 'display': display});
      }
      else {
        $stickyCell.css('display', 'none');
      }
    }
    this.stickyTable.css('width', this.originalTable.outerWidth());
  }
};

})(jQuery);
;

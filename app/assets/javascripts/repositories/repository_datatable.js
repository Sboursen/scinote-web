/*
  globals I18n _ SmartAnnotation FilePreviewModal animateSpinner DataTableHelpers
  HelperModule RepositoryDatatableRowEditor prepareRepositoryHeaderForExport
  initAssignedTasksDropdown initBMTFilter initReminderDropdown initBSTooltips
*/

//= require jquery-ui/widgets/sortable
//= require repositories/row_editor.js


var RepositoryDatatable = (function(global) {
  'use strict';

  var TABLE_ID = '';
  var TABLE_WRAPPER_ID = '.repository-table';
  var TABLE = null;
  var EDITABLE = false;
  var SELECT_ALL_SELECTOR = '#checkbox input[name=select_all]';
  const STATUS_POLLING_INTERVAL = 10000;

  var rowsSelected = [];
  var rowsLocked = [];

  // Tells whether we're currently viewing or editing table
  var currentMode = 'viewMode';

  // Extend datatables API with searchable options
  // (http://stackoverflow.com/questions/39912395/datatables-dynamically-set-columns-searchable)
  $.fn.dataTable.Api.register('isColumnSearchable()', function(colSelector) {
    var idx = this.column(colSelector).index();
    return this.settings()[0].aoColumns[idx].bSearchable;
  });
  $.fn.dataTable.Api
    .register('setColumnSearchable()', function(colSelector, value) {
      if (value !== this.isColumnSearchable(colSelector)) {
        let idx = this.column(colSelector).index();
        this.settings()[0].aoColumns[idx].bSearchable = value;
        if (value === true) {
          this.rows().invalidate();
        }
      }
      return value;
    });

  function allSelectedRowsAreOnPage() {
    let visibleRowIds = $(
      `#repository-table-${$(TABLE_ID).data('repository-id')} tbody tr`
    ).toArray().map((r) => parseInt(r.id, 10));

    return rowsSelected.every(r => visibleRowIds.includes(r));
  }

  // Enable/disable edit button
  function updateButtons() {
    if (currentMode === 'viewMode') {
      $(TABLE_WRAPPER_ID).removeClass('editing');
      $('.repository-save-changes-link').off('click');
      $('.repository-edit-overlay').hide();
      $('#saveCancel').hide();
      $('.manage-repo-column-index').prop('disabled', false);
      $('#shareRepoBtn').removeClass('disabled');
      $('#viewSwitchButton').removeClass('disabled');
      $('#addRepositoryRecord').prop('disabled', false);
      $('.dataTables_length select').prop('disabled', false);
      $('#repository-acitons-dropdown').prop('disabled', false);
      $('#repository-columns-dropdown').find('.dropdown-toggle').prop('disabled', false);
      $('th').removeClass('disable-click');
      $('.repository-row-selector').prop('disabled', false);
      $('.dataTables_filter input').prop('disabled', false);
      $('#addRepositoryRecord').show();
      if (!$('#saveRepositoryFilters').hasClass('hidden')) {
        $('#saveRepositoryFilters').show();
      }
      $('#hideRepositoryReminders').show();
      $('#importRecordsButton').show();
      if (rowsSelected.length === 0) {
        $('#exportRepositoriesButton').addClass('disabled');
        $('#copyRepositoryRecords').prop('disabled', true);
        $('#editRepositoryRecord').prop('disabled', true);
        $('#archiveRepositoryRecordsButton').prop('disabled', true);
        $('#restoreRepositoryRecords').prop('disabled', true);
        $('#deleteRepositoryRecords').prop('disabled', true);
        $('#editDeleteCopy').hide();
        $('#toolbarPrintLabel').hide();
      } else {
        $('#editRepositoryRecord').prop('disabled', !allSelectedRowsAreOnPage());
        $('#exportRepositoriesButton').removeClass('disabled');
        $('#archiveRepositoryRecordsButton').prop('disabled', false);
        $('#copyRepositoryRecords').prop('disabled', false);
        $('#restoreRepositoryRecords').prop('disabled', false);
        $('#deleteRepositoryRecords').prop('disabled', false);
        $('#importRecordsButton').hide();

        if (rowsSelected.some(r=> rowsLocked.indexOf(r) >= 0)) { // Some selected rows is rowsLocked
          $('#editRepositoryRecord').prop('disabled', true);
          $('#archiveRepositoryRecordsButton').prop('disabled', true);
        }
        $('#editDeleteCopy').show();
        $('#toolbarPrintLabel').show();
      }
      $('#team-switch').css({ 'pointer-events': 'auto', opacity: 1 });
      $('#navigationGoBtn').prop('disabled', false);
    } else if (currentMode === 'editMode') {
      $(TABLE_WRAPPER_ID).addClass('editing');
      $('.repository-save-changes-link').on('click', function() {
        $('#saveRecord').click();
      });
      $('#importRecordsButton').hide();
      $('#editDeleteCopy').hide();
      $('#addRepositoryRecord').hide();
      $('#hideRepositoryReminders').hide();
      if (!$('#saveRepositoryFilters').hasClass('hidden')) {
        $('#saveRepositoryFilters').hide();
      }
      $('#saveCancel').show();
      $('.manage-repo-column-index').prop('disabled', true);
      $('#shareRepoBtn').addClass('disabled');
      $('#viewSwitchButton').addClass('disabled');
      $('#repository-acitons-dropdown').prop('disabled', true);
      $('.dataTables_length select').prop('disabled', true);
      $('#addRepositoryRecord').prop('disabled', true);
      $('#editRepositoryRecord').prop('disabled', true);
      $('#archiveRepositoryRecordsButton').prop('disabled', true);
      $('#assignRepositoryRecords').prop('disabled', true);
      $('#unassignRepositoryRecords').prop('disabled', true);
      $('#repository-columns-dropdown').find('.dropdown-toggle').prop('disabled', true);
      $('th').addClass('disable-click');
      $('.repository-row-selector').prop('disabled', true);
      $('.dataTables_filter input').prop('disabled', true);
      $('#toolbarPrintLabel').hide();
      $('.repository-edit-overlay').show();
      $('#team-switch').css({ 'pointer-events': 'none', opacity: 0.6 });
      $('#navigationGoBtn').prop('disabled', true);
    }
  }

  function clearRowSelection() {
    $('.dt-body-center .repository-row-selector').prop('checked', false);
    $('.dt-body-center .repository-row-selector').closest('tr').removeClass('selected');
    rowsSelected = [];
  }

  function disableCheckboxToggleOnCheckboxPreview() {
    $('.checklist-dropdown').click(function(e) {
      $(e.currentTarget).closest('tr').find('.repository-row-selector').trigger('click');
    });
  }

  function changeToViewMode() {
    currentMode = 'viewMode';
    // Table specific stuff
    TABLE.button(0).enable(true);
    $('#saveRecord').attr('disabled', false);
    $(TABLE_WRAPPER_ID).find('tr').removeClass('blocked');
    updateButtons();
    disableCheckboxToggleOnCheckboxPreview();
  }

  function changeToEditMode() {
    currentMode = 'editMode';

    clearRowSelection();
    updateButtons();
  }

  // Updates "Select all" control in a data table
  function updateDataTableSelectAllCtrl() {
    var $table = TABLE.table().node();
    var $header = TABLE.table().header();
    var $chkboxAll = $('.repository-row-selector', $table);
    var $chkboxChecked = $('.repository-row-selector:checked', $table);
    var chkboxSelectAll = $(SELECT_ALL_SELECTOR, $header).get(0);
    // If none of the checkboxes are checked
    if ($chkboxChecked.length === 0) {
      chkboxSelectAll.checked = false;
      if ('indeterminate' in chkboxSelectAll) {
        chkboxSelectAll.indeterminate = false;
      }

    // If all of the checkboxes are checked
    } else if ($chkboxChecked.length === $chkboxAll.length) {
      chkboxSelectAll.checked = true;
      if ('indeterminate' in chkboxSelectAll) {
        chkboxSelectAll.indeterminate = false;
      }

    // If some of the checkboxes are checked
    } else {
      chkboxSelectAll.checked = true;
      if ('indeterminate' in chkboxSelectAll) {
        chkboxSelectAll.indeterminate = true;
      }
    }
  }

  function initRowSelection() {
    // Handle clicks on checkbox
    $(TABLE_ID).on('change', '.repository-row-selector', function(ev) {
      var $row;
      var data;
      var rowId;
      var index;

      if (currentMode !== 'viewMode') {
        return;
      }
      // Get row ID
      $row = $(this).closest('tr');
      data = TABLE.row($row).data();
      rowId = data.DT_RowId;

      // Determine whether row ID is in the list of selected row IDs
      index = $.inArray(rowId, rowsSelected);

      // If checkbox is checked and row ID is not in list of selected row IDs
      if (this.checked && index === -1) {
        rowsSelected.push(rowId);
      // Otherwise, if checkbox is not checked and row ID is in list of selected row IDs
      } else if (!this.checked && index !== -1) {
        rowsSelected.splice(index, 1);
      }

      if (this.checked) {
        $row.addClass('selected');
      } else {
        $row.removeClass('selected');
      }

      updateDataTableSelectAllCtrl();

      ev.stopPropagation();
      updateButtons();
      // Update number of selected records info
      $('#selected_info').html(' (' + rowsSelected.length + ' entries selected)');
    });

    // Handle click on "Select all" control
    $(SELECT_ALL_SELECTOR).change(function(ev) {
      if (this.checked) {
        $('.repository-row-selector:not(:checked)').trigger('click');
      } else {
        $('.repository-row-selector:checked').trigger('click');
      }
      // Prevent click event from propagating to parent
      ev.stopPropagation();
    });
  }

  function checkAvailableColumns() {
    $.ajax({
      url: $(TABLE_ID).data('available-columns'),
      type: 'GET',
      dataType: 'json',
      success: function(data) {
        var columnsIds = data.columns;
        var presentColumns = $(TABLE_ID).data('repository-columns-ids');
        if (!_.isEqual(columnsIds.sort(), presentColumns.sort())) {
          alert($(TABLE_ID).data('columns-changed'));
          animateSpinner();
          location.reload();
        }
      },
      error: function() {
        location.reload();
      }
    });
  }

  function initItemEditIcon() {
    $(TABLE_ID).on('click', '.repository-row-edit-icon', function(ev) {
      let rowId = $(ev.target).closest('tr').attr('id');
      let row = TABLE.row(`#${rowId}`);

      $(row.node()).find('.repository-row-selector').trigger('click');

      checkAvailableColumns();

      RepositoryDatatableRowEditor.switchRowToEditMode(row);

      changeToEditMode();
    });
  }

  function initSaveButton() {
    $(TABLE_WRAPPER_ID).on('click', '#saveRecord', function() {
      var $table = $(TABLE_ID);
      RepositoryDatatableRowEditor.validateAndSubmit($table, $('#saveRecord'));
    });
  }

  function initActiveRemindersFilter() {
    $(TABLE_WRAPPER_ID).find('#only_reminders').on('change', function() {
      var $activeRemindersFilter = $(this).closest('.active-reminders-filter');

      $(TABLE_WRAPPER_ID).find('table').attr('data-only-reminders', $(this).is(':checked'));

      if ($(this).is(':checked')) {
        $activeRemindersFilter.attr('title', $activeRemindersFilter.data('checkedTitle'));
      } else {
        $activeRemindersFilter.attr('title', $activeRemindersFilter.data('uncheckedTitle'));
      }

      TABLE.ajax.reload();
    });
  }

  function resetTableView() {
    var filterSaveButtonVisible = !$('#saveRepositoryFilters').hasClass('hidden');
    $.getJSON($(TABLE_ID).data('toolbar-url'), (data) => {
      $('#toolbarButtonsDatatable').remove();
      $(data.html).appendTo('div.toolbar');
      if (filterSaveButtonVisible) {
        $('#saveRepositoryFilters').removeClass('hidden');
      }
      if (typeof initBMTFilter === 'function') initBMTFilter();

      initBSTooltips();
    });

    TABLE.ajax.reload(null, false);
    changeToViewMode();
    SmartAnnotation.closePopup();
    animateSpinner(null, false);
  }

  function initCancelButton() {
    $(TABLE_WRAPPER_ID).on('click', '#cancelSave', function() {
      resetTableView();
    });
  }

  function appendInput(form, val, name) {
    $(form).append(
      $('<input>').attr('type', 'hidden').attr('name', name).val(val)
    );
  }

  function initHeaderTooltip() {
    // Fix compatibility of fixed table header and column names modal-tooltip
    $('.modal-tooltip').off();
    $('.modal-tooltip').hover(function() {
      var $tooltip = $(this).find('.modal-tooltiptext');
      var offsetLeft = $tooltip.offset().left;
      var offsetTop = $tooltip.offset().top;
      if ((offsetLeft + 200) > $(window).width()) {
        offsetLeft -= 150;
      }
      $('body').append($tooltip);
      $tooltip.css('background-color', '#d2d2d2');
      $tooltip.css('border-radius', '6px');
      $tooltip.css('color', '#333');
      $tooltip.css('display', 'block');
      $tooltip.css('left', offsetLeft + 'px');
      $tooltip.css('padding', '5px');
      $tooltip.css('position', 'absolute');
      $tooltip.css('text-align', 'center');
      $tooltip.css('top', offsetTop + 'px');
      $tooltip.css('visibility', 'visible');
      $tooltip.css('width', '200px');
      $tooltip.css('word-wrap', 'break-word');
      $(this).data('dropdown-tooltip', $tooltip);
    }, function() {
      $(this).append($(this).data('dropdown-tooltip'));
      $(this).data('dropdown-tooltip').removeAttr('style');
    });
  }

  function initExportActions() {
    $('#exportRepositoriesButton').on('click', function() {
      $('#exportRepositoryModal').modal('show');
    });


    $('form#form-export').off().submit(function() {
      var form = this;
      if (currentMode === 'viewMode') {
        // Remove all hidden fields
        $(form).find('input[name=row_ids\\[\\]]').remove();
        $(form).find('input[name=header_ids\\[\\]]').remove();

        // Append visible column information
        $('table' + TABLE_ID + ' thead tr th').each(function() {
          var th = $(this);
          var val = prepareRepositoryHeaderForExport(th);

          if (val) {
            appendInput(form, val, 'header_ids[]');
          }
        });

        // Append records
        $.each(rowsSelected, function(index, rowId) {
          appendInput(form, rowId, 'row_ids[]');
        });
      }
    })
      .on('ajax:beforeSend', function() {
        animateSpinner(null, true);
      })
      .on('ajax:complete', function() {
        $('#exportRepositoryModal').modal('hide');
        animateSpinner(null, false);
      })
      .on('ajax:success', function(ev, data) {
        HelperModule.flashAlertMsg(data.message, 'success');
      })
      .on('ajax:error', function(ev, data) {
        HelperModule.flashAlertMsg(data.responseJSON.message, 'danger');
      });
  }

  // Adjust columns width in table header
  function adjustTableHeader() {
    TABLE.columns.adjust();
    $('.dropdown-menu').parent()
      .on('shown.bs.dropdown hidden.bs.dropdown', function() {
        TABLE.columns.adjust();
      });
  }

  function checkSnapshottingStatus() {
    $.getJSON($(TABLE_ID).data('status-url'), (statusData) => {
      if (statusData.snapshot_provisioning) {
        setTimeout(() => { checkSnapshottingStatus(); }, STATUS_POLLING_INTERVAL);
      } else {
        EDITABLE = statusData.editable;
        $('.repository-provisioning-notice').remove();
        resetTableView();
      }
    });
  }

  function dataTableInit() {
    TABLE = $(TABLE_ID).DataTable({
      dom: "R<'repository-toolbar hidden'<'repository-search-container'f>>t<'pagination-row hidden'<'pagination-info'li><'pagination-actions'p>>",
      stateSave: true,
      processing: true,
      serverSide: true,
      sScrollX: '100%',
      sScrollXInner: '100%',
      order: $(TABLE_ID).data('default-order'),
      stateDuration: 0,
      colReorder: {
        fixedColumnsLeft: 2,
        realtime: false
      },
      destroy: true,
      ajax: {
        url: $(TABLE_ID).data('source'),
        contentType: 'application/json',
        data: function(d) {
          d.archived = $('.repository-show').hasClass('archived');

          if ($('[data-external-ids]').length) {
            d.external_ids = $('[data-external-ids]').attr('data-external-ids').split(',');
          }

          if ($('[data-repository-filter-json]').attr('data-repository-filter-json')) {
            d.advanced_search = JSON.parse($('[data-repository-filter-json]').attr('data-repository-filter-json'));
          }

          if ($('[data-only-reminders]').attr('data-only-reminders') === 'true') {
            d.only_reminders = true;
          }

          return JSON.stringify(d);
        },
        global: false,
        type: 'POST'
      },
      columnDefs: [{
        // Checkbox column needs special handling
        targets: 0,
        visible: true,
        searchable: false,
        orderable: false,
        className: 'dt-body-center',
        sWidth: '1%',
        render: function(data, type, row) {
          return `<div class="sci-checkbox-container">
                    <input class='repository-row-selector sci-checkbox' type='checkbox' data-editable="${row.recordEditable}">
                    <span class='sci-checkbox-label'></span>
                  </div>`;
        }
      }, {
        // Assigned column is not searchable
        targets: 1,
        visible: true,
        searchable: false,
        orderable: true,
        className: 'assigned-column',
        sWidth: '1%',
        render: function(data, type, row) {
          let content = $.fn.dataTable.render.AssignedTasksValue(data, row);
          let icon;
          if (!row.recordEditable) {
            icon = `<i class="repository-row-lock-icon fas fa-lock" title="${I18n.t('repositories.table.locked_item')}"></i>`;
          } else if (EDITABLE) {
            icon = '<i class="repository-row-edit-icon fas fa-pencil-alt" data-view-mode="active"></i>';
          } else {
            icon = '';
          }
          content = icon + content;
          return content;
        }
      }, {
        // Name column is clickable
        targets: 3,
        visible: true,
        render: function(data, type, row) {
          return "<a href='" + row.recordInfoUrl + "'"
                 + "class='record-info-link'>" + data + '</a>';
        }
      }, {
        // Added on column
        targets: 4,
        class: 'added-on',
        visible: true
      }, {
        targets: '_all',
        render: function(data) {
          if (typeof data === 'object' && $.fn.dataTable.render[data.value_type]) {
            return $.fn.dataTable.render[data.value_type](data);
          }
          return data;
        }
      }, {
        targets: 'row-stock',
        className: 'item-stock',
        sWidth: '1%',
        render: function(data) {
          return $.fn.dataTable.render.RepositoryStockValue(data);
        }
      }],
      language: {
        emptyTable: I18n.t('repositories.show.no_items'),
        zeroRecords: I18n.t('repositories.show.no_items_matched')
      },
      rowCallback: function(row, data) {
        $(row).attr('data-editable', data.recordEditable);
        $(row).attr('data-manage-stock-url', data.manageStockUrl);
        // Get row ID
        let rowId = data.DT_RowId;
        // If row ID is in the list of selected row IDs
        if ($.inArray(rowId, rowsSelected) !== -1) {
          $(row).find('input[type="checkbox"]').prop('checked', true);
          $(row).addClass('selected');
        }
      },
      columns: (function() {
        var columns = $(TABLE_ID).data('default-table-columns');
        var customColumns = $(TABLE_ID).find('thead th[data-type]');
        for (let i = 0; i < columns.length; i += 1) {
          columns[i].data = String(i);
          columns[i].defaultContent = '';
        }
        customColumns.each((i, column) => {
          var columnData = $(column).data('type') === 'RepositoryStockValue' ? 'stock' : String(columns.length);
          columns.push({
            visible: true,
            searchable: true,
            data: columnData,
            defaultContent: $.fn.dataTable.render['default' + column.dataset.type](column.id)
          });
        });

        return columns;
      }()),
      drawCallback: function() {
        animateSpinner(this, false);
        changeToViewMode();
        updateDataTableSelectAllCtrl();

        // Prevent row toggling when selecting user smart annotation link
        SmartAnnotation.preventPropagation('.atwho-user-popover');

        // Show number of selected rows near pages info
        $('#repository-table_info').append('<span id="selected_info"></span>');
        $('#selected_info').html(' (' + rowsSelected.length + ' entries selected)');

        // Hide edit button if not all selected rows are on the current page
        $('#editRepositoryRecord').prop('disabled', !allSelectedRowsAreOnPage());

        if ($('.repository-show').hasClass('archived')) {
          TABLE.columns([6, 7]).visible(true);
        }
      },
      preDrawCallback: function() {
        var archived = $('.repository-show').hasClass('archived');
        TABLE.context[0].oLanguage.sEmptyTable = archived ? I18n.t('repositories.show.no_archived_items') : I18n.t('repositories.show.no_items');
        TABLE.context[0].oLanguage.sZeroRecords = archived ? I18n.t('repositories.show.no_archived_items_matched') : I18n.t('repositories.show.no_items_matched');
        animateSpinner(this);
        $('.record-info-link').off('click');
      },
      stateLoadCallback: function(settings, callback) {
        var repositoryId = $(TABLE_ID).data('repository-id');
        $.ajax({
          url: '/repositories/' + repositoryId + '/state_load',
          data: {},
          dataType: 'json',
          type: 'POST',
          success: function(json) {
            var archived = $('.repository-show').hasClass('archived');
            if (json.state.columns[6]) json.state.columns[6].visible = archived;
            if (json.state.columns[7]) json.state.columns[7].visible = archived;
            if (json.state.search) delete json.state.search;
            callback(json.state);
          }
        });
      },
      stateSaveCallback: function(settings, data) {
        // Send an Ajax request to the server with the state object
        let repositoryId = $(TABLE_ID).data('repository-id');

        $.ajax({
          url: '/repositories/' + repositoryId + '/state_save',
          contentType: 'application/json',
          data: JSON.stringify({ state: data }),
          dataType: 'json',
          type: 'POST'
        });
      },
      fnInitComplete: function() {
        initHeaderTooltip();
        disableCheckboxToggleOnCheckboxPreview();

        DataTableHelpers.initSearchField(
          $(TABLE_ID).closest('.dataTables_wrapper'),
          I18n.t('repositories.show.filter_inventory_items')
        );

        let toolBar = $($('#repositoryToolbar').html());
        toolBar.find('.toolbar-search').html($('.repository-search-container'));
        $('.repository-toolbar').html(toolBar);
        if (typeof initBMTFilter === 'function') initBMTFilter();

        RepositoryDatatableRowEditor.initFormSubmitAction(TABLE);
        initExportActions();
        initItemEditIcon();
        initSaveButton();
        initCancelButton();
        initBSTooltips();

        DataTableHelpers.initLengthAppearance($(TABLE_ID).closest('.dataTables_wrapper'));

        $('<img class="barcode-scanner" src="/images/icon_small/barcode.png"></img>').appendTo($('.search-container'));

        if ($('.repository-show').length) {
          $('.dataTables_scrollBody, .dataTables_scrollHead').css('overflow', '');
        }

        $('.repository-toolbar, .pagination-row').removeClass('hidden');

        $(TABLE_ID).find('tr[data-editable=false]').each(function(_, e) {
          rowsLocked.push(parseInt($(e).attr('id'), 10));
        });

        // go back to manage columns index in modal, on column save, after table loads
        $('#manage-repository-column .back-to-column-modal').trigger('click');


        initAssignedTasksDropdown(TABLE_ID);
        initReminderDropdown(TABLE_ID);

        initActiveRemindersFilter();
        renderFiltersDropdown();
        setTimeout(function() {
          adjustTableHeader();
        }, 500);
      }
    });

    // hack to replace filter placeholder
    $('.dataTables_filter .form-control').attr('placeholder', $('.dataTables_filter label').text());
    $('.dataTables_filter label').contents().filter(function() {
      return this.nodeType === 3;
    }).remove();

    // Handle click on table cells with checkboxes
    $(TABLE_ID).on('click', 'tbody td', function(ev) {
      // Skip if clicking on selector checkbox, edit icon or link
      if ($(ev.target).is('.row-reminders-icon, .repository-row-selector, .repository-row-edit-icon, a')) return;

      $(this).parent().find('.repository-row-selector').trigger('click');
    });

    // Handling of special errors
    $(TABLE_ID).on('xhr.dt', function(e, settings, json) {
      if (json.custom_error) {
        json.data = [];
        json.recordsFiltered = 0;
        json.recordsTotal = 0;
        TABLE.one('draw', function() {
          $('#filtersDropdownButton').removeClass('active-filters');
          $('#saveRepositoryFilters').addClass('hidden');
          $('.repository-table-error').addClass('active').text(json.custom_error);
        });
      }
    })

    initRowSelection();
    $(window).resize(() => {
      setTimeout(() => {
        adjustTableHeader();
      }, 500);
    });

    return TABLE;
  }

  global.onClickDeleteRecord = function() {
    animateSpinner();
    $.ajax({
      url: $('table' + TABLE_ID).data('delete-record'),
      type: 'POST',
      dataType: 'json',
      data: { selected_rows: rowsSelected },
      success: function(data) {
        HelperModule.flashAlertMsg(data.flash, data.color);
        rowsSelected = [];
        resetTableView();
      },
      error: function(ev) {
        if (ev.status === 403) {
          HelperModule.flashAlertMsg(I18n.t('repositories.js.permission_error'), ev.responseJSON.style);
        } else {
          animateSpinner(null, false);
          HelperModule.flashAlertMsg(ev.responseJSON.flash, 'danger');
        }
      }
    });
  };

  $('.repository-show')
    .on('click', '#addRepositoryRecord', function() {
      checkAvailableColumns();
      RepositoryDatatableRowEditor.addNewRow(TABLE);
      changeToEditMode();
      $('.tooltip').remove();
    })
    .on('click', '#copyRepositoryRecords', function() {
      animateSpinner();
      $.ajax({
        url: $('table' + TABLE_ID).data('copy-records'),
        type: 'POST',
        dataType: 'json',
        data: { selected_rows: rowsSelected },
        success: function(data) {
          HelperModule.flashAlertMsg(data.flash, 'success');
          rowsSelected = [];
          resetTableView();
        },
        error: function(ev) {
          if (ev.status === 403) {
            HelperModule.flashAlertMsg(I18n.t('repositories.js.permission_error'), ev.responseJSON.style);
          } else {
            animateSpinner(null, false);
            HelperModule.flashAlertMsg(ev.responseJSON.flash, 'danger');
          }
        }
      });
    })
    .on('click', '#archiveRepositoryRecordsButton', function() {
      animateSpinner();
      $.ajax({
        url: $('table' + TABLE_ID).data('archive-records'),
        type: 'POST',
        dataType: 'json',
        data: { selected_rows: rowsSelected },
        success: function(data) {
          HelperModule.flashAlertMsg(data.flash, 'success');
          rowsSelected = [];
          resetTableView();
        },
        error: function(ev) {
          if (ev.status === 403) {
            HelperModule.flashAlertMsg(
              I18n.t('repositories.js.permission_error'), ev.responseJSON.style
            );
          } else if (ev.status === 422) {
            HelperModule.flashAlertMsg(
              ev.responseJSON.error, 'danger'
            );
            animateSpinner(null, false);
          }
        }
      });
    })
    .on('click', '#restoreRepositoryRecords', function() {
      animateSpinner();
      $.ajax({
        url: $('table' + TABLE_ID).data('restore-records'),
        type: 'POST',
        dataType: 'json',
        data: { selected_rows: rowsSelected },
        success: function(data) {
          HelperModule.flashAlertMsg(data.flash, 'success');
          rowsSelected = [];
          resetTableView();
        },
        error: function(ev) {
          if (ev.status === 403) {
            HelperModule.flashAlertMsg(
              I18n.t('repositories.js.permission_error'), ev.responseJSON.style
            );
          } else if (ev.status === 422) {
            HelperModule.flashAlertMsg(
              ev.responseJSON.error, 'danger'
            );
            animateSpinner(null, false);
          }
        }
      });
    })
    .on('click', '#editRepositoryRecord', function() {
      checkAvailableColumns();

      $(TABLE_ID).find('.repository-row-edit-icon').remove();

      rowsSelected.forEach(function(rowNumber) {
        RepositoryDatatableRowEditor.switchRowToEditMode(TABLE.row('#' + rowNumber));
      });

      changeToEditMode();
      adjustTableHeader();
    })
    .on('click', '#deleteRepositoryRecords', function() {
      $('#deleteRepositoryRecord').modal('show');
    })
    .on('click', '#hideRepositoryReminders', function() {
      var visibleReminderRepositoryRowIds = $('.row-reminders-dropdown').map(
        function() { return $(this).closest('[role=row]').attr('id'); }
      ).toArray();

      $.ajax({
        type: 'POST',
        url: $(this).data('hideRemindersUrl'),
        dataType: 'json',
        data: {
          visible_reminder_repository_row_ids: visibleReminderRepositoryRowIds
        },
        success: function() {
          $('#hideRepositoryReminders').remove();
          TABLE.ajax.reload();
          $('.tooltip').remove();
        }
      });
    });

  // Handle enter key
  $(document).off('keypress').keypress(function(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (currentMode === 'editMode' && keycode === '13') {
      $('#saveRecord').click();
    }
  });

  global.clearFileInput = function(el) {
    var parent = $(el).closest('div.repository-input-file-field');
    var input = parent.find('input:file')[0];
    // hide clear button
    $(parent.find('a[data-action="removeAsset"]')[0]).hide();
    // reset value
    input.value = '';
    // add flag
    $(input).attr('remove', true);
    // clear fileName
    $(parent.find('.file-name-label')[0]).text(I18n.t('general.file.no_file_chosen'));
    $(parent.find('.form-group')[0]).removeClass('has-error');
    parent.removeClass('has-error');
    $(parent.find('.help-block')[0]).remove();
  };

  function init(id) {
    TABLE_ID = id;
    EDITABLE = $(TABLE_ID).data('editable');
    TABLE = dataTableInit();
    if ($(TABLE_ID).data('snapshot-provisioning')) {
      setTimeout(() => { checkSnapshottingStatus(); }, STATUS_POLLING_INTERVAL);
    }
  }

  function destroy() {
    if (TABLE !== null) {
      TABLE.destroy();
      TABLE = null;
    }
    TABLE_ID = '';
  }

  function redrawTableOnSidebarToggle() {
    $('#wrapper').on('sideBar::hide sideBar::hidden', function() {
      var orgignalWidth = $('.repository-show .dataTables_scrollHead .table.dataTable').width();
      var windowWidth = $(window).width();
      if (windowWidth > orgignalWidth + 363) {
        $('.repository-show .dataTables_scrollHead')
          .find('.table.dataTable').css('width', (orgignalWidth + 280) + 'px');
      }
      document.documentElement.style.setProperty('--repository-sidebar-margin', '83px');
    });

    $('#wrapper').on('sideBar::show', function() {
      var orgignalWidth = $('.repository-show .dataTables_scrollHead .table.dataTable').width();
      var windowWidth = $(window).width();
      if (windowWidth > orgignalWidth + 83) {
        $('.repository-show .dataTables_scrollHead')
          .find('.table.dataTable').css('width', (orgignalWidth - 280) + 'px');
      }
      document.documentElement.style.setProperty('--repository-sidebar-margin', '363px');
    });

    $('#wrapper').on('sideBar::hidden sideBar::shown', function() {
      adjustTableHeader();
    });
  }

  function renderFiltersDropdown() {
    let dropdown = $('#repositoryFilterTemplate').html();
    $('.toolbar-filters').html(dropdown);
    if (typeof initRepositoryFilter === 'function') initRepositoryFilter();
  }

  return Object.freeze({
    init: init,
    destroy: destroy,
    reload: function() {
      TABLE.ajax.reload();
      clearRowSelection();
    },
    selectedRows: () => { return rowsSelected; },
    redrawTableOnSidebarToggle: redrawTableOnSidebarToggle,
    checkAvailableColumns: checkAvailableColumns
  });
}(window));

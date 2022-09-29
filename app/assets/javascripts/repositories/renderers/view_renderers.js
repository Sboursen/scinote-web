/* global I18n twemoji */

$.fn.dataTable.render.RepositoryAssetValue = function(data) {
  var asset = data.value;
  if (asset.id) {
    return `
      <div class="asset-value-cell">
        ${asset.icon_html}
        <div>
          <a  class="file-preview-link"
            title="repository asset value: ${asset}"
            id="modal_link${asset.id}"
            data-no-turbolink="true"
            data-id="true"
            data-status="asset-present"
            data-preview-url="${asset.preview_url}"
            href="${asset.url}"
            >
            ${asset.file_name}
          </a>
        </div>
      </div>
    `;
  }
  return `<div title="repository processing error image" class="processing-error">
            <i class="fas fa-exclamation-triangle"></i>
            ${I18n.t('my_modules.repository.full_view.error')}
          </div>`;
};

$.fn.dataTable.render.defaultRepositoryAssetValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryTextValue = function(data) {
  var text = $(`<span class="text-value">${data.value.view}</span>`);
  text.attr('data-edit-value', data.value.edit);
  return text.prop('outerHTML');
};

$.fn.dataTable.render.defaultRepositoryTextValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryListValue = function(data) {
  return `<span data-value-id="${data.value.id}" class="list-label">${data.value.text}</span>`;
};

$.fn.dataTable.render.defaultRepositoryListValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryStatusValue = function(data) {
  return `
  <div class="repository-status-value-container" title="${data.value.icon} ${data.value.status}">
    <span class="repository-status-value-icon">${twemoji.parse(data.value.icon)}</span>
    <span data-value-id="${data.value.id}" class="status-label">${data.value.status}</span>
  </div>
  `;
};

$.fn.dataTable.render.defaultRepositoryStatusValue = function() {
  return '';
};

$.fn.dataTable.render.defaultRepositoryDateValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryDateValue = function(data) {
  let reminderClass = data.value.reminder ? 'reminder' : '';
  return `<span class="${reminderClass}
                title="repository date: ${data}"
                date-cell-value" data-datetime="${data.value.datetime}"
                data-date="${data.value.formatted}">${data.value.formatted}</span>`;
};

$.fn.dataTable.render.defaultRepositoryDateTimeValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryDateTimeValue = function(data) {
  let reminderClass = data.value.reminder ? 'reminder' : '';
  return `<span class="${reminderClass} date-time-cell-value"
                title="repository date time value: ${data}"
                data-time="${data.value.time_formatted}"
                data-datetime="${data.value.datetime}"
                data-date="${data.value.date_formatted}">${data.value.formatted}</span>`;
};

$.fn.dataTable.render.defaultRepositoryTimeValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryTimeValue = function(data) {
  return `<span data-time="${data.value.formatted}"
                title="repository time value: ${data}"
                data-datetime="${data.value.datetime}">${data.value.formatted}</span>`;
};

$.fn.dataTable.render.defaultRepositoryTimeRangeValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryTimeRangeValue = function(data) {
  return `<span title="repository time start: ${data.value.start_time.formatted}"
                data-time="${data.value.start_time.formatted}"
                data-datetime="${data.value.start_time.datetime}">${data.value.start_time.formatted}</span> -
          <span title="repository time end: ${data.value.end_time.formatted}"
                data-time="${data.value.end_time.formatted}"
                data-datetime="${data.value.end_time.datetime}">${data.value.end_time.formatted}</span>`;
};

$.fn.dataTable.render.defaultRepositoryDateTimeRangeValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryDateTimeRangeValue = function(data) {
  return `<span title="repository datetime start: ${data.value.start_time.time_formatted}"
                data-time="${data.value.start_time.time_formatted}"
                data-datetime="${data.value.start_time.datetime}"
                data-date="${data.value.start_time.date_formatted}">${data.value.start_time.formatted}</span> -
          <span title="repository datetime end: ${data.value.end_time.time_formatted}"
                data-time="${data.value.end_time.time_formatted}"
                data-datetime="${data.value.end_time.datetime}"
                data-date="${data.value.end_time.date_formatted}">${data.value.end_time.formatted}</span>`;
};

$.fn.dataTable.render.defaultRepositoryDateRangeValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryDateRangeValue = function(data) {
  return `<span title="repository date start: ${data.value.start_time.formatted}"
                data-datetime="${data.value.start_time.datetime}"
                data-date="${data.value.start_time.formatted}">${data.value.start_time.formatted}</span> -
          <span title="repository date end: ${data.value.end_time.formatted}"
                data-datetime="${data.value.end_time.datetime}"
                data-date="${data.value.end_time.formatted}">${data.value.end_time.formatted}</span>`;
};

$.fn.dataTable.render.RepositoryChecklistValue = function(data) {
  var render = '&#8212;';
  var options = data.value;
  var optionsList;
  if (options.length === 1) {
    render = `<span class="checklist-options" data-checklist-items='${JSON.stringify(options)}'>
      ${options[0].label}
    </span>`;
  } else if (options.length > 1) {
    optionsList = $(' <ul class="dropdown-menu checklist-dropdown-menu" role="menu"></ul');
    $.each(options, function(i, option) {
      $(`<li class="checklist-item">${option.label}</li>`).appendTo(optionsList);
    });

    render = `
      <span title="repository checklist dropdown" class="dropdown checklist-dropdown">
        <span data-toggle="dropdown" class="checklist-options" aria-haspopup="true" data-checklist-items='${JSON.stringify(options)}'>
          ${options.length} ${I18n.t('libraries.manange_modal_column.checklist_type.multiple_options')}
        </span>
        ${optionsList[0].outerHTML}
      </span>`;
  }
  return render;
};

$.fn.dataTable.render.defaultRepositoryChecklistValue = function() {
  return '&#8212;';
};

$.fn.dataTable.render.defaultRepositoryNumberValue = function() {
  return '';
};

$.fn.dataTable.render.RepositoryNumberValue = function(data) {
  return `<span class="number-value" data-value="${data.value}">
            ${data.value}
          </span>`;
};

$.fn.dataTable.render.AssignedTasksValue = function(data, row) {
  let tasksLinkHTML;

  if (data.tasks > 0) {
    let tooltip = I18n.t('repositories.table.assigned_tooltip', {
      tasks: data.tasks,
      experiments: data.experiments,
      projects: data.projects
    });
    tasksLinkHTML = `<div class="assign-counter-container dropdown" title="${tooltip}"
            data-task-list-url="${data.task_list_url}">
              <a title="repository assigned count" href="#" class="assign-counter has-assigned"
                data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">${data.tasks}</a>
              <div class="dropdown-menu" role="menu">
                <div class="sci-input-container right-icon">
                  <input title="repository assigned task search" type="text" class="sci-input-field search-tasks"
                    placeholder="${I18n.t('repositories.table.assigned_search')}"></input>
                  <i class="fas fa-times-circle clear-search"></i>
                </div>
                <div class="tasks"></div>
              </div>
            </div>`;
  } else {
    tasksLinkHTML = "<div class='assign-counter-container'><span class='assign-counter' title='assign counter item'>0</span></div>";
  }
  if (row.hasActiveReminders) {
    return `<div class="dropdown row-reminders-dropdown" data-row-reminders-url="${row.rowRemindersUrl}" tabindex='-1'>
              <i class="fas fa-bell dropdown-toggle row-reminders-icon" data-toggle="dropdown"
                id="rowReminders${row.DT_RowId}}"></i>
              <ul class="dropdown-menu" role="menu" aria-labelledby="rowReminders${row.DT_RowId}">
              </ul>
            </div>`
      + tasksLinkHTML;
  }

  return tasksLinkHTML;
};

$.fn.dataTable.render.RepositoryStockValue = function(data) {
  if (data) {
    if (data.value) {
      if (data.stock_managable) {
        return `<a title="repository stock value: ${data.value}" 
                   class="manage-repository-stock-value-link stock-value-view-render stock-${data.stock_status}">
                  ${data.value.stock_formatted}
                  </a>`;
      }
      return `<span title="render stock value ${data.value}" class="stock-value-view-render
                           ${data.displayWarnings ? `stock-${data.stock_status}` : ''}">
                ${data.value.stock_formatted}
                </span>`;
    }
    if (data.stock_managable) {
      return `<a title="unassigned stock data: ${data}" class="manage-repository-stock-value-link not-assigned-stock">
                <i class="fas fa-box-open"></i>
                ${I18n.t('libraries.manange_modal_column.stock_type.add_stock')}
              </a>`;
    }
  }
  return `<span title="repository empty stock" class="empty-stock-render">
            ${I18n.t('libraries.manange_modal_column.stock_type.no_item_stock')}
          </span>`;
};

$.fn.dataTable.render.defaultRepositoryStockValue = function() {
  return $.fn.dataTable.render.RepositoryStockValue();
};

$.fn.dataTable.render.RepositoryStockConsumptionValue = function(data = {}) {
  // covers case of snapshots
  if (!data.stock_present && data.value && data.value.consumed_stock !== null) {
    return `<span title="empty stock render" 
                  class="empty-consumed-stock-render">
                  ${data.value.consumed_stock_formatted}
            </span>`;
  }
  if (!data.stock_present) {
    return '<span title="empty stock and data" class="empty-consumed-stock-render"> - </span>';
  }
  if (!data.consumptionManagable && data.value && !data.value.consumed_stock) {
    return `<span title="locked consumption" class="consumption-locked">
    ${I18n.t('libraries.manange_modal_column.stock_type.stock_consumption_locked')}
    </span>`;
  }
  if (!data.consumptionPermitted || !data.consumptionManagable) {
    return `<span title="repository unpermitted and not managable stock" 
                  class="empty-consumed-stock-render">
                  ${data.value.consumed_stock_formatted}
            </span>`;
  }
  if (!data.value.consumed_stock) {
    return `<a title="repository consumed stock manager" 
               href="${data.updateStockConsumptionUrl}" 
               class="manage-repository-consumed-stock-value-link">
              <i class="fas fa-vial"></i>
              ${I18n.t('libraries.manange_modal_column.stock_type.add_stock_consumption')}
            </a>`;
  }
  return `<a title="repository consumed stock render" href="${data.updateStockConsumptionUrl}"
                class="manage-repository-consumed-stock-value-link stock-value-view-render">
              ${data.value.consumed_stock_formatted}
            </a>`;
};

$.fn.dataTable.render.defaultRepositoryStockConsumptionValue = function() {
  return $.fn.dataTable.render.RepositoryStockConsumptionValue();
};

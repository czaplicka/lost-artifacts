export function drawWebsiteNavigation(
  search,
  page,
  {
    x,
    y,
    width,
    button,
    background = 0xe5dac5,
    minimumWidth = 125,
    rowHeight = 31
  }
) {
  const links = page.links || [];

  if (!links.length) return 0;

  const safeWidth = Math.max(1, width);

  const columns = Math.max(
    1,
    Math.min(
      links.length,
      Math.floor(safeWidth / minimumWidth)
    )
  );

  const rows = Math.ceil(
    links.length / columns
  );

  const height = rows * rowHeight + 4;

  search.ui.drawing.rectangle(
    x,
    y,
    safeWidth,
    height,
    background
  );

  const gap = 4;

  const buttonWidth = Math.max(
    1,
    (safeWidth - gap * (columns + 1)) /
      columns
  );

  links.forEach((link, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const active = link.pageId === page.id;

    button(
      x + gap + column * (buttonWidth + gap),
      y + 3 + row * rowHeight,
      buttonWidth,
      rowHeight - 5,
      link.label,
      () => {
        if (!active) {
          search.openPage(link.pageId);
        }
      },
      true,
      active
    );
  });

  return height;
}

import type { ReactNode } from "react";
import { LogIn, UserPlus, HelpCircle } from "lucide-react";

type Variant = "sign-in" | "sign-up";

type Step = {
  title: string;
  text: ReactNode;
};

// Инструкция сбоку от формы: простыми словами объясняем, какие кнопки нажимать
const CONTENT: Record<
  Variant,
  { title: string; intro: string; steps: Step[]; help: string[] }
> = {
  "sign-in": {
    title: "Как войти в личный кабинет",
    intro:
      "Вход нужен, чтобы видеть каталог запчастей, наличие и цены. Для входа выберите один из двух способов — тот, которым вы регистрировались.",
    steps: [
      {
        title: "Способ 1. Кнопка «Продолжить с Google»",
        text: "Если при регистрации вы выбирали свою почту Google (Gmail) — нажмите верхнюю кнопку «Продолжить с Google», выберите свой почтовый ящик в открывшемся окне и подтвердите. Пароль вводить не нужно.",
      },
      {
        title: "Способ 2. Email и пароль",
        text: "Если вы регистрировались с паролем — впишите в первое поле свой email (например ivanov@mail.ru), во второе поле пароль, затем нажмите зелёную кнопку «Войти».",
      },
      {
        title: "Если аккаунта ещё нет",
        text: "Нажмите нижнюю синюю кнопку «Нет аккаунта? Зарегистрироваться» — откроется страница создания аккаунта.",
      },
      {
        title: "Что будет после входа",
        text: "Если появится надпись «Аккаунт не подтверждён» — всё в порядке, вы зарегистрированы. Нужно дождаться, пока администратор откроет вам доступ.",
      },
    ],
    help: [
      "Пароль не подходит? Проверьте раскладку клавиатуры (русская/английская) и не включён ли Caps Lock — заглавные и строчные буквы различаются.",
      "Если войти не получается — позвоните администратору, он проверит вашу учётную запись.",
    ],
  },
  "sign-up": {
    title: "Как создать аккаунт",
    intro:
      "Регистрация нужна один раз. После неё администратор подтвердит вас, и откроется доступ к каталогу, ценам и заказам.",
    steps: [
      {
        title: "Способ 1. Кнопка «Продолжить с Google»",
        text: "Самый быстрый вариант: нажмите верхнюю кнопку «Продолжить с Google» и выберите свой почтовый ящик Gmail. Пароль придумывать не нужно. Затем сайт попросит один раз ввести номер телефона.",
      },
      {
        title: "Способ 2. Заполнить три поля",
        text: (
          <>
            <strong className="font-semibold italic text-foreground">
              Email
            </strong>{" "}
            — ваша рабочая почта, на неё будет привязан аккаунт.{" "}
            <strong className="font-semibold italic text-foreground">
              Телефон
            </strong>{" "}
            — в формате +375XXXXXXXXX.{" "}
            <strong className="font-semibold italic text-foreground">
              Пароль
            </strong>{" "}
            — придумайте свой и обязательно запишите, восстановить его на сайте
            нельзя.
          </>
        ),
      },
      {
        title: "Нажмите зелёную кнопку «Зарегистрироваться»",
        text: "После нажатия вы вернётесь на страницу входа — это значит, что аккаунт создан. Свяжитесь с администратором для полчения доступа.",
      },
      {
        title: "Дождитесь подтверждения",
        text: "Администратор подтвердит регистрацию и откроет доступ. До этого момента вместо каталога будет надпись «Аккаунт не подтверждён» — просто подождите или напомните администратору.",
      },
    ],
    help: [
      "Указывайте тот же номер телефона, который вы давали администратору — тогда аккаунт свяжется с вашей уже заведённой карточкой клиента.",
      "Если аккаунт у вас уже есть — нажмите нижнюю синюю кнопку «Уже есть аккаунт? Войти».",
      "Возникли сложности — позвоните администратору, он зарегистрирует вас сам.",
    ],
  },
};

const AuthInstructions = ({ variant }: { variant: Variant }) => {
  const { title, intro, steps, help } = CONTENT[variant];
  const Icon = variant === "sign-in" ? LogIn : UserPlus;

  return (
    <aside className="w-full rounded-lg border bg-muted/30 p-5 text-base leading-relaxed lg:max-w-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-green-600" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <p className="mt-3 text-muted-foreground">{intro}</p>

      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-blue-500" />
          <p className="font-medium">Если что-то не получается</p>
        </div>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {help.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default AuthInstructions;
